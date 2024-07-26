import { MongoResourcePermission } from '../../support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '../../common/mongo/sessionRun';
import { ResourcePerWithTmbWithUser } from '@fastgpt/global/support/permission/type';
import { DatasetPermission } from '@fastgpt/global/support/permission/dataset/controller';
import { MongoDataset } from './schema';
import { MongoTeamMember } from 'support/user/team/teamMemberSchema';
import { Permission } from '@fastgpt/global/support/permission/controller';

/**
 * 更新知识库协作者权限
 * @param param0
 */
export async function updateDatasetCollaboratorPer({
  teamId,
  datasetId,
  permission,
  tmbIds
}: {
  teamId: string;
  datasetId: string;
  permission: number;
  tmbIds: string[];
}) {
  await mongoSessionRun(async (session) => {
    for (const tmbId of tmbIds) {
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
  var datasetPers = (await MongoResourcePermission.find({
    teamId,
    resourceId: datasetId,
    resourceType: PerResourceTypeEnum.dataset
  }).populate('tmbId')) as ResourcePerWithTmbWithUser[];

  const dataset = await MongoDataset.findById(datasetId);

  return datasetPers.map((x) => {
    const Per = new DatasetPermission({
      per: x.permission ?? dataset?.defaultPermission,
      isOwner: String(dataset?.tmbId) === x.tmbId._id
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
 * 删除知识库指定的协作者
 * @param param0
 */
export async function deleteDatasetCollaboratorPer({
  teamId,
  datasetId,
  tmbId
}: {
  teamId: string;
  datasetId: string;
  tmbId: string;
}) {
  await MongoResourcePermission.deleteOne({
    teamId,
    tmbId,
    resourceId: datasetId,
    resourceType: PerResourceTypeEnum.dataset
  });
}
