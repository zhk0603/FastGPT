import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { clearCookie } from '@fastgpt/service/support/permission/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId: curTeamId } = await authCert({ req, authToken: true });

    const { status, tmbId } = req.body as { status: TeamMemberStatusEnum; tmbId: string };
    if (status == null || tmbId == null) {
      throw new Error('参数无效!');
    }

    const tmb = await MongoTeamMember.findById(tmbId);
    if (!tmb) {
      throw new Error('can not find it');
    }

    await mongoSessionRun(async (session) => {
      if (status == TeamMemberStatusEnum.reject) {
        // 删除权限
        await MongoResourcePermission.deleteMany(
          {
            teamId: tmb.teamId,
            tmbId: tmb._id
          },
          { session }
        );
        // 删除 tmb
        await MongoTeamMember.findByIdAndDelete(tmb._id);
        // 退出的是当前登录team
        if (curTeamId == tmb.teamId.toString()) {
          clearCookie(res);
        }
      } else {
        await MongoTeamMember.findByIdAndUpdate(
          tmb._id,
          {
            status
          },
          { session }
        );
      }
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
