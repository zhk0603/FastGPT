import type { NextApiRequest } from 'next';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { Types } from '@fastgpt/service/common/mongo';
import { readFromSecondary } from '@fastgpt/service/common/mongo/utils';
import { DatasetCollectionTagsSchemaType } from '@fastgpt/global/core/dataset/type';

type TagListRequest = {
  datasetId: string;
  offset: number;
  pageSize: number;
  searchText: string;
  tag?: string;
};

async function handler(req: NextApiRequest) {
  const { datasetId, offset = 0, pageSize = 10, searchText, tag } = req.body as TagListRequest;

  if (!datasetId) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // auth Manage
  const { teamId } = await authDataset({
    req,
    authToken: true,
    authApiKey: true,
    datasetId,
    per: ManagePermissionVal
  });

  const match = {
    teamId: new Types.ObjectId(teamId),
    datasetId: new Types.ObjectId(datasetId),
    ...(searchText ? { tag: new RegExp(searchText, 'i') } : {}),
    ...(tag ? { tag: tag } : {})
  };

  const selectField = {
    _id: 1,
    teamId: 1,
    datasetId: 1,
    tag: 1
  };

  const [list, total]: [DatasetCollectionTagsSchemaType[], number] = await Promise.all([
    MongoDatasetCollectionTags.aggregate([
      {
        $match: match
      },
      {
        $skip: offset
      },
      {
        $limit: pageSize
      }
    ]),
    MongoDatasetCollectionTags.countDocuments(match, {
      ...readFromSecondary
    })
  ]);

  return {
    list,
    total
  };
}

export default NextAPI(handler);
