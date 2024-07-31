import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { CreateUsageProps } from '@fastgpt/global/support/wallet/usage/api';
import { MongoUsage } from '@fastgpt/service/support/wallet/usage/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const data = req.body as CreateUsageProps;
    await MongoUsage.create([data]);
    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
