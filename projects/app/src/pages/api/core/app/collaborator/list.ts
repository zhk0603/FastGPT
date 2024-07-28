import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { getAppCollaboratorList } from '@fastgpt/service/core/app/controllerPro';
import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { authApp } from '@fastgpt/service/support/permission/app/auth';

async function handler(req: NextApiRequest): Promise<any> {
  await connectToDatabase();

  const { appId } = req.query as {
    appId: string;
  };

  if (appId == null) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  const { teamId } = await authApp({
    req,
    authToken: true,
    appId,
    per: ReadPermissionVal
  });

  return await getAppCollaboratorList({ teamId, appId });
}

export default NextAPI(handler);
