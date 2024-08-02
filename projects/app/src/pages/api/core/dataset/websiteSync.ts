import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { NextAPI } from '@/service/middleware/entry';
import { DatasetItemType } from '@fastgpt/global/core/dataset/type';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { firecrawlApp } from '@fastgpt/plugins/src/firecrawl/utils';

type Query = {
  billId: string;
  datasetId: string;
};

async function handler(req: ApiRequestProps<Query>): Promise<void> {
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

  const crawlResult = await firecrawlApp.crawlUrl(
    url,
    {
      pageOptions: {
        onlyIncludeTags: dataset.websiteConfig?.selector || undefined,
        waitFor: 30000
      }
    },
    false
  );
}

export default NextAPI(handler);
