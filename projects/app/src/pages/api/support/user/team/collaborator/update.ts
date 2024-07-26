import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import {
  ManagePermissionVal,
  ReadPermissionVal
} from '@fastgpt/global/support/permission/constant';
import {
  getTeamsInfoByUserId,
  updateTmbsPer
} from '@fastgpt/service/support/user/team/controllerPro';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = await authUserPer({ req, authToken: true, per: ManagePermissionVal });

    const { permission, tmbIds } = req.body as { permission: string; tmbIds: Array<string> };
    if (permission == null || tmbIds == null || tmbIds.length == 0) {
      throw new Error('参数错误');
    }

    await updateTmbsPer({ teamId, permission, tmbIds });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
