import { addLog } from '@fastgpt/service/common/system/log';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import Queue from 'bull';
import { Queue as BullQueue, Job } from 'bull';
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

let datasetQueue: BullQueue;
let isProcessorRegistered = false;

export function getDatasetQueue() {
  if (!datasetQueue) {
    if (!process.env.REDIS_URL) {
      throw new Error('未配置Redis链接。');
    }

    datasetQueue = new Queue('web-datasets', process.env.REDIS_URL as string, {
      settings: {
        lockDuration: 1 * 60 * 1000, // 1 minute in milliseconds,
        lockRenewTime: 15 * 1000, // 15 seconds in milliseconds
        stalledInterval: 30 * 1000,
        maxStalledCount: 10
      },
      defaultJobOptions: {
        attempts: 5
      }
    });
    addLog.info('Datasets queue created');
  }
  return datasetQueue;
}

export function initMq() {
  if (!process.env.REDIS_URL) {
    return;
  }
  const query = getDatasetQueue();
  if (!isProcessorRegistered) {
    query.process(Math.floor(Number(process.env.NUM_WORKERS_PER_QUEUE ?? 2)), processJob);
    isProcessorRegistered = true;
  }
}

async function processJob(job: Job, done: any) {
  const { jobId, status } = job.data;

  addLog.debug('processJob:', jobId);

  const dataset = await MongoDataset.findOne({ 'jobInfo.jobId': jobId });
  if (!dataset) {
    addLog.warn('jobId 没有关联的数据集 ', jobId);
    done();
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

    done();
    return;
  }

  const {
    markdown: rawText,
    metadata: { title, sourceURL }
  } = job.data;

  // 后期通过页面配置
  const chunkSize = 1024;
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

  done();
}
