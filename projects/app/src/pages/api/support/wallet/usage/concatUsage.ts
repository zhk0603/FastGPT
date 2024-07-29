import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { addLog } from '@fastgpt/service/common/system/log';
import { ConcatUsageProps } from '@fastgpt/global/support/wallet/usage/api';
import { MongoUsage } from '@fastgpt/service/support/wallet/usage/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const data = req.body as ConcatUsageProps;
    addLog.warn('concatUsage', data);

    if (data.billId) {
      const usage = await MongoUsage.findById(data.billId);
      if (usage) {
        usage.totalPoints += data.totalPoints;
        if (data.listIndex != null && data.listIndex != undefined) {
          usage.list[data.listIndex].tokens = data.tokens;
          usage.list[data.listIndex].amount = data.totalPoints;
        }

        await MongoUsage.findByIdAndUpdate(usage._id, {
          totalPoints: usage.totalPoints,
          list: usage.list
        });
      }
    }

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
