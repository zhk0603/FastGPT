import { addLog } from '@fastgpt/service/common/system/log';
import Queue from 'bull';
import { Queue as BullQueue, Job } from 'bull';

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
    query.process(Math.floor(Number(process.env.NUM_WORKERS_PER_QUEUE ?? 8)), processJob);
    isProcessorRegistered = true;
  }
}

async function processJob(job: Job, done) {
  addLog.debug('job:', job);
  done();
}
