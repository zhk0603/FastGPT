import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getTeamMemberList } from '@fastgpt/service/support/user/team/controllerPro';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = await authCert({ req, authToken: true });

    jsonRes(res, { data: await getTeamMemberList(teamId) });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
