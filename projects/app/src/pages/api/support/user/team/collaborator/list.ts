import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getResourceAllClbs } from '@fastgpt/service/support/permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = await authCert({ req, authToken: true });
    const tmbPers = await getResourceAllClbs({ teamId, resourceType: PerResourceTypeEnum.team });
    jsonRes(res, { data: tmbPers });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
