import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { updateDatasetCollaboratorPer } from '@fastgpt/service/core/dataset/controllerPro';
import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';

async function handler(req: NextApiRequest): Promise<any> {
  await connectToDatabase();

  const {
    datasetId,
    permission,
    tmbIds = []
  } = req.body as {
    datasetId: string;
    permission: number;
    tmbIds: string[];
  };

  if (datasetId == null || permission == null || tmbIds.length == 0) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // auth owner
  const { teamId } = await authDataset({
    req,
    authToken: true,
    datasetId,
    per: ManagePermissionVal
  });

  await updateDatasetCollaboratorPer({
    teamId,
    datasetId,
    permission,
    tmbIds
  });
}

export default NextAPI(handler);
