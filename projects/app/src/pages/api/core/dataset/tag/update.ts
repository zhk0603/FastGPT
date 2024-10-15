import type { NextApiRequest } from 'next';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { Types } from '@fastgpt/service/common/mongo';
import { readFromSecondary } from '@fastgpt/service/common/mongo/utils';

type Request = {
  datasetId: string;
  tag: string;
  tagId: string;
};

async function handler(req: NextApiRequest) {
  const { datasetId, tag, tagId } = req.body as Request;

  if (!datasetId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  await authDataset({
    req,
    authToken: true,
    authApiKey: true,
    datasetId,
    per: ManagePermissionVal
  });

  await MongoDatasetCollectionTags.findByIdAndUpdate(tagId, {
    tag
  });
}

export default NextAPI(handler);
