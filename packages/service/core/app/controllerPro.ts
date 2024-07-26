import { MongoResourcePermission } from '../../support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '../../common/mongo/sessionRun';
import { ResourcePerWithTmbWithUser } from '@fastgpt/global/support/permission/type';
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
  tmbIds
}: {
  teamId: string;
  appId: string;
  permission: number;
  tmbIds: string[];
}) {
  await mongoSessionRun(async (session) => {
    for (const tmbId of tmbIds) {
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
  });
}

/**
 * 获取APP协作者列表
 */
export async function getAppCollaboratorList({ appId, teamId }: { appId: string; teamId: string }) {
  var datasetPers = (await MongoResourcePermission.find({
    teamId,
    resourceId: appId,
    resourceType: PerResourceTypeEnum.app
  }).populate('tmbId')) as ResourcePerWithTmbWithUser[];

  const app = await MongoApp.findById(appId);

  return datasetPers.map((x) => {
    const Per = new DatasetPermission({
      per: x.permission ?? app?.defaultPermission,
      isOwner: String(app?.tmbId) === x.tmbId._id
    });

    return {
      tmbId: x.tmbId._id,
      avatar: x.tmbId.userId.avatar,
      name: x.tmbId.name,
      permission: Per
    };
  });
}

/**
 * 删除App指定的协作者
 * @param param0
 */
export async function deleteAppCollaboratorPer({
  teamId,
  appId,
  tmbId
}: {
  teamId: string;
  appId: string;
  tmbId: string;
}) {
  await MongoResourcePermission.deleteOne({
    teamId,
    tmbId,
    resourceId: appId,
    resourceType: PerResourceTypeEnum.app
  });
}
