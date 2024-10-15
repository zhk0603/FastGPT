import type { NextApiRequest } from 'next';
import { findCollectionAndChild } from '@fastgpt/service/core/dataset/collection/utils';
import { delCollectionAndRelatedSources } from '@fastgpt/service/core/dataset/collection/controller';
import {
  authDataset,
  authDatasetCollection
} from '@fastgpt/service/support/permission/dataset/auth';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { NextAPI } from '@/service/middleware/entry';
import {
  ManagePermissionVal,
  WritePermissionVal
} from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';

async function handler(req: NextApiRequest) {
  const { id: tagId, datasetId } = req.query as { id: string; datasetId: string };

  if (!tagId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  const { teamId } = await authDataset({
    req,
    authToken: true,
    authApiKey: true,
    datasetId,
    per: ManagePermissionVal
  });

  // 使用了此标签的集合
  const collections = await MongoDatasetCollection.find({
    teamId,
    datasetId,
    tags: { $in: [tagId] }
  })
    .select('_id tags')
    .lean()
    .exec();

  // delete
  await mongoSessionRun(async (session) => {
    await MongoDatasetCollection.updateMany(
      { _id: { $in: collections.map((x) => x._id) }, datasetId },
      { $pull: { tags: tagId } }, // 从 tags 数组中移除特定 tag
      { session }
    );

    // 删除标签
    await MongoDatasetCollectionTags.deleteOne(
      {
        _id: tagId
      },
      {
        session
      }
    );
  });
}

export default NextAPI(handler);
