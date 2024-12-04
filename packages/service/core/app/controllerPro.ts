import { MongoResourcePermission } from '../../support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '../../common/mongo/sessionRun';
import {
  ResourcePerWithGroup,
  ResourcePerWithTmbWithUser
} from '@fastgpt/global/support/permission/type';
import { DatasetPermission } from '@fastgpt/global/support/permission/dataset/controller';
import { MongoApp } from './schema';

/**
 * 更新APP协作者权限
 * @param param0
 */
export async function updateAppCollaboratorPer({
  teamId,
  appId,
  permission,
  members,
  groups
}: {
  teamId: string;
  appId: string;
  permission: number;
  members: string[];
  groups: string[];
}) {
  await mongoSessionRun(async (session) => {
    for (const tmbId of members) {
      const appPer = await MongoResourcePermission.findOneAndUpdate(
        {
          teamId,
          tmbId,
          resourceType: PerResourceTypeEnum.app,
          resourceId: appId
        },
        {
          permission
        },
        { session }
      );

      if (appPer == null) {
        // 不存在，创建
        await MongoResourcePermission.create(
          [
            {
              teamId,
              tmbId,
              resourceId: appId,
              resourceType: PerResourceTypeEnum.app,
              permission
            }
          ],
          { session }
        );
      }
    }

    for (const group of groups) {
      const appPer = await MongoResourcePermission.findOneAndUpdate(
        {
          teamId,
          groupId: group,
          resourceType: PerResourceTypeEnum.app,
          resourceId: appId
        },
        {
          permission
        },
        { session }
      );

      if (appPer == null) {
        // 不存在，创建
        await MongoResourcePermission.create(
          [
            {
              teamId,
              groupId: group,
              resourceId: appId,
              resourceType: PerResourceTypeEnum.app,
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
 * 获取APP协作者列表
 */
export async function getAppCollaboratorList({ appId, teamId }: { appId: string; teamId: string }) {
  const app = await MongoApp.findById(appId);

  const getTmbCollaborators = async () => {
    var datasetPers = (await MongoResourcePermission.find({
      teamId,
      resourceId: appId,
      resourceType: PerResourceTypeEnum.app,
      tmbId: {
        $exists: true
      }
    }).populate('tmbId')) as ResourcePerWithTmbWithUser[];

    return datasetPers.map((x) => {
      const Per = new DatasetPermission({
        per: x.permission ?? app?.defaultPermission,
        isOwner: String(app?.tmbId) === x.tmbId._id
      });

      return {
        teamId: x.teamId,
        tmbId: x.tmbId._id,
        avatar: x.tmbId.userId.avatar,
        name: x.tmbId.name,
        permission: Per
      };
    });
  };

  const getGroupCollaborators = async () => {
    var datasetPers = (await MongoResourcePermission.find({
      teamId,
      resourceId: appId,
      resourceType: PerResourceTypeEnum.app,
      groupId: {
        $exists: true
      }
    }).populate('groupId')) as ResourcePerWithGroup[];

    return datasetPers.map((x) => {
      const Per = new DatasetPermission({
        per: x.permission ?? app?.defaultPermission,
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
  };

  const tmbCollaboratorList = await getTmbCollaborators();
  const groupCollaboratorList = await getGroupCollaborators();
  return [...tmbCollaboratorList, ...groupCollaboratorList];
}

/**
 * 删除App指定的协作者
 * @param param0
 */
export async function deleteAppCollaboratorPer({
  teamId,
  appId,
  tmbId,
  groupId
}: {
  teamId: string;
  appId: string;
  tmbId?: string;
  groupId?: string;
}) {
  await MongoResourcePermission.deleteOne({
    teamId,
    tmbId,
    groupId,
    resourceId: appId,
    resourceType: PerResourceTypeEnum.app
  });
}
