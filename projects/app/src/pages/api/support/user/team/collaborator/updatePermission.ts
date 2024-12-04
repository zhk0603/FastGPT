import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { updateResourcePermission } from '@fastgpt/service/support/user/team/controllerPro';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = await authCert({ req, authToken: true });

    const { memberId, groupId, permission } = req.body as {
      memberId?: string;
      groupId?: string;
      permission: number;
    };

    await updateResourcePermission({ teamId, memberId, groupId, permission });

    jsonRes(res, { data: [] });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
