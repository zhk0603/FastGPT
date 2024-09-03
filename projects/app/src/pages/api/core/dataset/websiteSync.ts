import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { NextAPI } from '@/service/middleware/entry';
import { DatasetItemType } from '@fastgpt/global/core/dataset/type';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { firecrawlApp } from '@fastgpt/plugins/src/firecrawl/utils';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { status } from 'nprogress';
import { DatasetStatusEnum } from '@fastgpt/global/core/dataset/constants';

type Query = {
  billId: string;
  datasetId: string;
};

async function handler(req: ApiRequestProps<Query>): Promise<{ jobId: string }> {
  const { billId, datasetId } = req.body;

  if (!datasetId || !billId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // 凭证校验
  const { dataset, permission } = await authDataset({
    req,
    authToken: true,
    datasetId,
    per: WritePermissionVal
  });

  const url = dataset.websiteConfig?.url;
  if (!url) {
    throw new Error('知识库未配置站点信息');
  }

  const strToArray = function (str: string | undefined) {
    if (str) {
      return str.split(',');
    }
    return undefined;
  };

  try {
    const crawlResult = await firecrawlApp.crawlUrl(
      url,
      {
        crawlerOptions: {
          includes: strToArray(dataset.websiteConfig?.includes),
          excludes: strToArray(dataset.websiteConfig?.excludes),
          limit: dataset.websiteConfig?.limit,
          maxDepth: dataset.websiteConfig?.maxDepth,
          ignoreSitemap: dataset.websiteConfig?.ignoreSitemap,
          allowBackwardCrawling: dataset?.websiteConfig?.allowBackwardCrawling
        },
        pageOptions: {
          replaceAllPathsWithAbsolutePaths: true,
          onlyIncludeTags: strToArray(dataset.websiteConfig?.onlyIncludeTags),
          onlyMainContent: dataset.websiteConfig?.onlyMainContent,
          removeTags: strToArray(dataset.websiteConfig?.removeTags),
          waitFor: dataset.websiteConfig?.waitFor
        }
      },
      false
    );

    await MongoDataset.findByIdAndUpdate(dataset._id, {
      jobInfo: {
        jobId: crawlResult.jobId,
        status: 'active'
      }
    });

    return {
      jobId: crawlResult.jobId
    };
  } catch (e) {
    await MongoDataset.findByIdAndUpdate(dataset._id, {
      status: DatasetStatusEnum.active
    });

    throw e;
  }
}

export default NextAPI(handler);
