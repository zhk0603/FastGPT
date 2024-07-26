import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { deleteDatasetCollaboratorPer } from '@fastgpt/service/core/dataset/controllerPro';
import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';

async function handler(req: NextApiRequest): Promise<any> {
  await connectToDatabase();

  const { datasetId, tmbId } = req.query as {
    datasetId: string;
    tmbId: string;
  };

  if (datasetId == null || tmbId == null) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // auth owner
  const { teamId } = await authDataset({
    req,
    authToken: true,
    datasetId,
    per: ManagePermissionVal
  });

  await deleteDatasetCollaboratorPer({
    teamId,
    datasetId,
    tmbId
  });
}

export default NextAPI(handler);
