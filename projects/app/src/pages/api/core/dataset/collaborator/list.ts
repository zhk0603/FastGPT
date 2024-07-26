import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { getDatasetCollaboratorList } from '@fastgpt/service/core/dataset/controllerPro';
import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';

async function handler(req: NextApiRequest): Promise<any> {
  await connectToDatabase();

  const { datasetId } = req.query as {
    datasetId: string;
  };

  if (datasetId == null) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  const { teamId } = await authDataset({
    req,
    authToken: true,
    datasetId,
    per: ManagePermissionVal
  });

  return await getDatasetCollaboratorList({ teamId, datasetId });
}

export default NextAPI(handler);
