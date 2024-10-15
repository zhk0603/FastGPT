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
};

async function handler(req: NextApiRequest) {
  const { datasetId, tag } = req.body as Request;

  if (!datasetId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  const { teamId } = await authDataset({
    req,
    authToken: true,
    authApiKey: true,
    datasetId,
    per: ManagePermissionVal
  });

  // 检查标签是否已经存在
  const existingTag = await MongoDatasetCollectionTags.findOne({ teamId, datasetId, tag });

  if (existingTag) {
    return Promise.reject('Tag already exists'); // 标签已经存在，返回相关信息
  }

  // 创建新的标签
  const [newTag] = await MongoDatasetCollectionTags.create([
    {
      teamId,
      datasetId,
      tag
    }
  ]);

  return newTag._id;
}

export default NextAPI(handler);
