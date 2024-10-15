import type { NextApiRequest } from 'next';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { Types } from '@fastgpt/service/common/mongo';
import { readFromSecondary } from '@fastgpt/service/common/mongo/utils';

type Request = {
  datasetId: string;
};

async function handler(req: NextApiRequest) {
  const { datasetId } = req.query as Request;

  if (!datasetId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  const { teamId } = await authDataset({
    req,
    authToken: true,
    authApiKey: true,
    datasetId,
    per: ReadPermissionVal
  });

  const match = {
    teamId: new Types.ObjectId(teamId),
    datasetId: new Types.ObjectId(datasetId)
  };

  const selectField = {
    _id: 1,
    teamId: 1,
    datasetId: 1,
    tag: 1
  };

  const list = await MongoDatasetCollectionTags.find(match, '_id', {
    ...readFromSecondary
  })
    .select(selectField)
    .lean();
  return {
    list
  };
}

export default NextAPI(handler);
