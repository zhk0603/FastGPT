import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { createJWT, setCookie } from '@fastgpt/service/support/permission/controller';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { authCert } from '@fastgpt/service/support/permission/auth/common';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { userId } = await authCert({ req, authToken: true });

    const { teamId } = req.body as { teamId: string };

    var tmb = await MongoTeamMember.findOne({
      userId,
      teamId,
      status: TeamMemberStatusEnum.active
    });

    if (tmb == null) {
      jsonRes(res, {
        code: 500,
        error: '您尚未加入此团队'
      });
      return;
    }

    const userDetail = await getUserDetail({
      tmbId: tmb._id
    });

    MongoUser.findByIdAndUpdate(userId, {
      lastLoginTmbId: userDetail.team.tmbId
    });

    const token = createJWT(userDetail);
    setCookie(res, token);

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
