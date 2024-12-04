import type { NextApiRequest } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { updateAppCollaboratorPer } from '@fastgpt/service/core/app/controllerPro';
import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { authApp } from '@fastgpt/service/support/permission/app/auth';

async function handler(req: NextApiRequest): Promise<any> {
  await connectToDatabase();

  const {
    appId,
    permission,
    members = [],
    groups = []
  } = req.body as {
    appId: string;
    permission: number;
    members: string[];
    groups: string[];
  };

  if (appId == null || permission == null) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // auth owner
  const { teamId } = await authApp({
    req,
    authToken: true,
    appId,
    per: ManagePermissionVal
  });

  await updateAppCollaboratorPer({
    teamId,
    appId,
    permission,
    members,
    groups
  });
}

export default NextAPI(handler);
