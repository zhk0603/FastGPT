import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { NextAPI } from '@/service/middleware/entry';
import { AuthOutLinkLimitProps } from '@fastgpt/global/support/outLink/api';
import { addLog } from '@fastgpt/service/common/system/log';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { outLinkUid } = req.body as AuthOutLinkLimitProps;
  addLog.debug('auth chat start >>>', req.body);

  jsonRes<{ uid: string }>(res, {
    data: {
      uid: outLinkUid
    }
  });
}

export default NextAPI(handler);
