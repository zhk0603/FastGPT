import { MongoResourcePermission } from '../../support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '../../common/mongo/sessionRun';
import {
  ResourcePerWithGroup,
  ResourcePerWithTmbWithUser
} from '@fastgpt/global/support/permission/type';
import { DatasetPermission } from '@fastgpt/global/support/permission/dataset/controller';
import { MongoDataset } from './schema';
import { DatasetSchemaType } from '@fastgpt/global/core/dataset/type';

/**
 * 更新知识库协作者权限
 * @param param0
 */
export async function updateDatasetCollaboratorPer({
  teamId,
  datasetId,
  permission,
  members,
  groups
}: {
  teamId: string;
  datasetId: string;
  permission: number;
  members: string[];
  groups: string[];
}) {
  await mongoSessionRun(async (session) => {
    for (const tmbId of members) {
      const datasetPer = await MongoResourcePermission.findOneAndUpdate(
        {
          teamId,
          tmbId,
          resourceType: PerResourceTypeEnum.dataset,
          resourceId: datasetId
        },
        {
          permission
        },
        { session }
      );

      if (datasetPer == null) {
        console.log('create');
        // 不存在，创建
        await MongoResourcePermission.create(
          [
            {
              teamId,
              tmbId,
              resourceId: datasetId,
              resourceType: PerResourceTypeEnum.dataset,
              permission
            }
          ],
          { session }
        );
      }
    }

    for (const group of groups) {
      const datasetPer = await MongoResourcePermission.findOneAndUpdate(
        {
          teamId,
          groupId: group,
          resourceType: PerResourceTypeEnum.dataset,
          resourceId: datasetId
        },
        {
          permission
        },
        { session }
      );

      if (datasetPer == null) {
        console.log('create');
        // 不存在，创建
        await MongoResourcePermission.create(
          [
            {
              teamId,
              groupId: group,
              resourceId: datasetId,
              resourceType: PerResourceTypeEnum.dataset,
              permission
            }
          ],
          { session }
        );
      }
    }
  });
}

/**
 * 获取知识库协作者列表
 * @param datasetId
 */
export async function getDatasetCollaboratorList({
  datasetId,
  teamId
}: {
  datasetId: string;
  teamId: string;
}) {
  const dataset = await MongoDataset.findById(datasetId);

  const tmbCollaboratorList = await getTmbCollaborators(teamId, datasetId, dataset);

  const groupCollaboratorList = await getGroupCollaborators(teamId, datasetId, dataset);

  return [...groupCollaboratorList, ...tmbCollaboratorList];
}

async function getTmbCollaborators(
  teamId: string,
  datasetId: string,
  dataset: DatasetSchemaType | null
) {
  var tmbPers = (await MongoResourcePermission.find({
    teamId,
    resourceId: datasetId,
    resourceType: PerResourceTypeEnum.dataset,
    tmbId: {
      $exists: true
    }
  }).populate('tmbId')) as ResourcePerWithTmbWithUser[];

  const tmbCollaboratorList = tmbPers.map((x) => {
    const Per = new DatasetPermission({
      per: x.permission ?? dataset?.defaultPermission,
      isOwner: String(dataset?.tmbId) === x.tmbId._id
    });

    return {
      teamId: x.teamId,
      tmbId: x.tmbId._id,
      avatar: x.tmbId.userId.avatar,
      name: x.tmbId.name,
      permission: Per
    };
  });
  return tmbCollaboratorList;
}

async function getGroupCollaborators(
  teamId: string,
  datasetId: string,
  dataset: DatasetSchemaType | null
) {
  var groupPers = (await MongoResourcePermission.find({
    teamId,
    resourceId: datasetId,
    resourceType: PerResourceTypeEnum.dataset,
    groupId: {
      $exists: true
    }
  }).populate('groupId')) as ResourcePerWithGroup[];

  const groupCollaboratorList = groupPers.map((x) => {
    const Per = new DatasetPermission({
      per: x.permission ?? dataset?.defaultPermission,
      isOwner: false
    });

    return {
      teamId: x.teamId,
      groupId: x.groupId._id,
      avatar: x.groupId.avatar,
      name: x.groupId.name,
      permission: Per
    };
  });
  return groupCollaboratorList;
}

/**
 * 删除知识库指定的协作者
 * @param param0
 */
export async function deleteDatasetCollaboratorPer({
  teamId,
  datasetId,
  tmbId,
  groupId
}: {
  teamId: string;
  datasetId: string;
  tmbId?: string;
  groupId?: string;
}) {
  await MongoResourcePermission.deleteOne({
    teamId,
    tmbId,
    groupId,
    resourceId: datasetId,
    resourceType: PerResourceTypeEnum.dataset
  });
}
