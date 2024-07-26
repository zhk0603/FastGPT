import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import {
  ManagePermissionVal,
  PerResourceTypeEnum,
  ReadPermissionVal,
  WritePermissionVal
} from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { UserModelSchema } from '@fastgpt/global/support/user/type';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import { InviteMemberResponse } from '@fastgpt/global/support/user/team/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    await authUserPer({ req, authToken: true, per: ManagePermissionVal });

    const {
      permission,
      teamId,
      usernames = []
    } = req.body as {
      permission: number;
      teamId: string;
      usernames: string[];
    };
    if (permission == null || teamId == null || usernames.length == 0) {
      throw new Error('参数无效!');
    }

    const getRoleByPer = function (per: number) {
      if (per == ReadPermissionVal) {
        return TeamMemberRoleEnum.visitor;
      }
      // 写也是 visitor ？
      if (per == WritePermissionVal) {
        return TeamMemberRoleEnum.visitor;
      }
      if (per == ManagePermissionVal) {
        return TeamMemberRoleEnum.admin;
      }
    };

    const result = {
      inTeam: [],
      inValid: [],
      invite: []
    } as InviteMemberResponse;

    await mongoSessionRun(async (session) => {
      for (const username of usernames) {
        const user = await MongoUser.findOne({ username });
        if (user == null) {
          result.inValid.push({
            userId: '',
            username: username
          });
          continue;
        }
        // 是否已经加入team
        const existsTeam = await MongoTeamMember.exists({
          teamId,
          userId: user._id
        });
        if (existsTeam) {
          result.inTeam.push({
            userId: user._id,
            username: username
          });
          continue;
        }

        // 用户是否存在默认团队
        const existsDefaultTeam = await MongoTeamMember.exists({
          userId: user._id,
          defaultTeam: true
        });

        const tmbs = await MongoTeamMember.create(
          [
            {
              teamId,
              userId: user._id,
              name: user.username,
              role: getRoleByPer(permission),
              status: TeamMemberStatusEnum.waiting,
              defaultTeam: !existsDefaultTeam
            }
          ],
          { session }
        );

        await MongoResourcePermission.create(
          [
            {
              teamId,
              tmbId: tmbs[0]._id,
              resourceType: PerResourceTypeEnum.team,
              permission
            }
          ],
          { session }
        );

        result.invite.push({
          userId: user._id,
          username: username
        });
      }
    });

    jsonRes(res, { data: result });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
