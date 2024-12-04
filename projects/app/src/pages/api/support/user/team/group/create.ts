import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support/permission/memberGroup/groupMemberSchema';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { NextAPI } from '@/service/middleware/entry';
import { addLog } from '@fastgpt/service/common/system/log';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { GroupMemberRole } from '@fastgpt/global/support/permission/memberGroup/constant';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await connectToDatabase();

  const { teamId, tmbId } = await authCert({ req, authToken: true });

  let group = req.body as {
    avatar: string;
    name: string;
  };

  const exists = await MongoMemberGroupModel.findOne({
    teamId,
    name: group.name
  });
  console.log(exists);
  if (exists) {
    return Promise.reject(TeamErrEnum.groupNameDuplicate);
  }

  await mongoSessionRun(async (session) => {
    // 创建 group
    const [groupId] = await MongoMemberGroupModel.create(
      [
        {
          teamId,
          ...group
        }
      ],
      { session }
    );

    // 将创建人作为owner角色加入group
    await MongoGroupMemberModel.create(
      [
        {
          teamId,
          groupId,
          tmbId,
          role: GroupMemberRole.owner
        }
      ],
      {
        session
      }
    );
    // 添加默认权限
    await MongoResourcePermission.create(
      [
        {
          teamId,
          groupId,
          resourceType: PerResourceTypeEnum.team,
          permission: TeamDefaultPermissionVal
        }
      ],
      { session }
    );
  });
}

export default NextAPI(handler);
