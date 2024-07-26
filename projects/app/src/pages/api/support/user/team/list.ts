import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { getTeamsInfoByUserId } from '@fastgpt/service/support/user/team/controllerPro';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { status } = req.query as { status: TeamMemberStatusEnum };

    const { tmb } = await authUserPer({ req, authToken: true, per: ReadPermissionVal });

    jsonRes(res, { data: await getTeamsInfoByUserId({ userId: tmb.userId, status }) });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
