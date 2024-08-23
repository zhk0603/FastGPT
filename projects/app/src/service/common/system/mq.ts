import { addLog } from '@fastgpt/service/common/system/log';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { Queue, Job, Worker } from 'bullmq';
import { rawText2Chunks } from '@fastgpt/service/core/dataset/read';
import {
  DatasetCollectionTypeEnum,
  DatasetStatusEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import { hashStr } from '@fastgpt/global/common/string/tools';
import { createTrainingUsage } from '@fastgpt/service/support/wallet/usage/controller';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { pushDataListToTrainingQueue } from '@fastgpt/service/core/dataset/training/controller';
import { Prompt_AgentQA } from '@fastgpt/global/core/ai/prompt/agent';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import systemMonitor from './system-monitor';

let datasetQueue: Queue;
let redisConnection: IORedis;
let isProcessorRegistered = false;

let isShuttingDown = false;

process.on('SIGINT', () => {
  addLog.info('Received SIGINT. Shutting down gracefully...');
  isShuttingDown = true;
});

const queueName = 'web-datasets';
const gotJobInterval = Number(process.env.CONNECTION_MONITOR_INTERVAL) || 20;
const connectionMonitorInterval = Number(process.env.CONNECTION_MONITOR_INTERVAL) || 10;
const jobLockExtendInterval = Number(process.env.JOB_LOCK_EXTEND_INTERVAL) || 15000;
const jobLockExtensionTime = Number(process.env.JOB_LOCK_EXTENSION_TIME) || 60000;
const cantAcceptConnectionInterval = Number(process.env.CANT_ACCEPT_CONNECTION_INTERVAL) || 2000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
}

export function getDatasetQueue() {
  if (!datasetQueue) {
    if (!process.env.REDIS_URL) {
      throw new Error('未配置Redis链接。');
    }

    datasetQueue = new Queue(queueName, { connection: getRedisConnection() });
    addLog.info('Datasets queue created');
  }
  return datasetQueue;
}

const processJobInternal = async (token: string, job: Job) => {
  const extendLockInterval = setInterval(async () => {
    addLog.info(`🐂 Worker extending lock on job ${job.id}`);
    await job.extendLock(token, jobLockExtensionTime);
  }, jobLockExtendInterval);

  try {
    await processJob(job, token);
    try {
      await job.moveToCompleted(null, token, false);
    } catch (e) {}
  } catch (error) {
    addLog.error('Job failed, error:', error);

    await job.moveToFailed(error as Error, token, false);
  } finally {
    clearInterval(extendLockInterval);
  }
};

async function processJob(job: Job, token: string): Promise<void> {
  const { jobId, status } = job.data;

  addLog.debug('processJob:', jobId);

  const dataset = await MongoDataset.findOne({ 'jobInfo.jobId': jobId });
  if (!dataset) {
    addLog.warn('jobId 没有关联的数据集 ', jobId);
    return;
  }

  if (status != 'active') {
    await MongoDataset.findByIdAndUpdate(dataset._id, {
      status: DatasetStatusEnum.active,
      jobInfo: {
        jobId,
        status
      }
    });

    return;
  }

  const {
    markdown: rawText,
    metadata: { title, sourceURL }
  } = job.data;

  // 后期通过页面配置
  const chunkSize = getVectorModel(dataset.vectorModel)?.defaultToken || 1024;
  const trainingType = TrainingModeEnum.chunk;
  const qaPrompt = Prompt_AgentQA.description;

  // 2. split chunks
  const chunks = rawText2Chunks({
    rawText,
    chunkLen: chunkSize,
    overlapRatio: trainingType === TrainingModeEnum.chunk ? 0.2 : 0,
    customReg: []
  });

  await mongoSessionRun(async (session) => {
    // 4. create collection
    const { _id: collectionId } = await createOneCollection({
      teamId: dataset.teamId,
      tmbId: dataset.tmbId,
      datasetId: dataset._id,
      type: DatasetCollectionTypeEnum.link,
      name: title,
      rawLink: sourceURL,

      // metadata: {
      //   relatedImgId: fileId
      // },

      // special metadata
      trainingType,
      chunkSize,
      chunkSplitter: '',
      qaPrompt,

      hashRawText: hashStr(rawText),
      rawTextLength: rawText.length,
      session
    });

    // 5. create training bill
    const { billId } = await createTrainingUsage({
      teamId: dataset.teamId,
      tmbId: dataset.tmbId,
      appName: sourceURL,
      billSource: UsageSourceEnum.training,
      vectorModel: getVectorModel(dataset.vectorModel)?.name,
      agentModel: getLLMModel(dataset.agentModel)?.name,
      session
    });

    // 6. insert to training queue
    await pushDataListToTrainingQueue({
      teamId: dataset.teamId,
      tmbId: dataset.tmbId,
      datasetId: dataset._id,
      collectionId,
      agentModel: dataset.agentModel,
      vectorModel: dataset.vectorModel,
      trainingMode: trainingType,
      prompt: qaPrompt,
      billId,
      data: chunks.map((item, index) => ({
        ...item,
        chunkIndex: index
      })),
      session
    });

    return collectionId;
  });
}

const workerFun = async (
  queueName: string,
  processJobInternal: (token: string, job: Job) => Promise<void>
) => {
  const worker = new Worker(queueName, null, {
    connection: getRedisConnection(),
    lockDuration: 1 * 60 * 1000, // 1 minute
    // lockRenewTime: 15 * 1000, // 15 seconds
    stalledInterval: 30 * 1000, // 30 seconds
    maxStalledCount: 10 // 10 times
  });

  worker.startStalledCheckTimer();

  const monitor = await systemMonitor;

  while (true) {
    if (isShuttingDown) {
      addLog.info('No longer accepting new jobs. SIGINT');
      break;
    }
    const token = uuidv4();
    const canAcceptConnection = await monitor.acceptConnection();
    if (!canAcceptConnection) {
      addLog.info('Cant accept connection');
      await sleep(cantAcceptConnectionInterval); // more sleep
      continue;
    }

    const job = await worker.getNextJob(token);
    if (job) {
      processJobInternal(token, job);
      await sleep(gotJobInterval);
    } else {
      await sleep(connectionMonitorInterval);
    }
  }
};

export function initMq() {
  if (!process.env.REDIS_URL) {
    return;
  }
  if (!isProcessorRegistered) {
    workerFun(queueName, processJobInternal);
    isProcessorRegistered = true;
  }
}
