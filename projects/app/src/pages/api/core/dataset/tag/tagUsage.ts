import type { NextApiRequest } from 'next';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { Types } from '@fastgpt/service/common/mongo';
import { readFromSecondary } from '@fastgpt/service/common/mongo/utils';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';

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

  // 查找所有与 datasetId 相关的标签
  const tags = await MongoDatasetCollectionTags.find({ teamId, datasetId }).exec();
  const tagIds = tags.map((tag) => tag._id.toString());

  // 使用 $in 操作符一次查询所有匹配标签的集合
  const collections = await MongoDatasetCollection.find({
    teamId,
    datasetId,
    tags: { $in: tagIds }
  })
    .select('_id tags')
    .lean()
    .exec();

  // 使用 Map 来存储每个 tagId 对应的 collections
  const tagUsageMap = new Map();

  collections.forEach((collection) => {
    collection.tags?.forEach((tagId) => {
      if (tagUsageMap.has(tagId)) {
        tagUsageMap.get(tagId).push(collection._id.toString());
      } else {
        tagUsageMap.set(tagId, [collection._id.toString()]);
      }
    });
  });

  // 返回格式化的结果
  return Array.from(tagUsageMap, ([tagId, collections]) => ({ tagId, collections }));
}

export default NextAPI(handler);
