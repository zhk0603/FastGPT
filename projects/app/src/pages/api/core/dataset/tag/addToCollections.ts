import type { NextApiRequest } from 'next';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';

type Request = {
  datasetId: string;
  tag?: string; // tag id
  tagLabel?: string; // tag label
  originCollectionIds: string[];
  collectionIds: string[];
};

async function handler(req: NextApiRequest) {
  let { datasetId, tag, tagLabel, originCollectionIds, collectionIds } = req.body as Request;

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

  // 如果没有指定tagid ，尝试根据 taglabel 解析
  if (tag == null || tag == '') {
    const tagDoc = await MongoDatasetCollectionTags.findOne({
      tag: tagLabel
    });
    if (tagDoc) {
      tag = tagDoc._id.toString();
    }
  }

  await mongoSessionRun(async (session) => {
    // Step 1: 从 originCollectionIds 中删除标签
    if (originCollectionIds.length > 0) {
      await MongoDatasetCollection.updateMany(
        { _id: { $in: originCollectionIds }, datasetId },
        { $pull: { tags: tag } }, // 从 tags 数组中移除特定 tag
        { session }
      );
    }

    // Step 2: 添加标签到新的 collectionIds
    if (collectionIds.length > 0) {
      await MongoDatasetCollection.updateMany(
        { _id: { $in: collectionIds }, datasetId },
        { $addToSet: { tags: tag } }, // 使用 $addToSet 确保标签不会重复添加
        { session }
      );
    }
  });
}

export default NextAPI(handler);
