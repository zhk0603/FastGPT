import { NextAPI } from '@/service/middleware/entry';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { splitText2Chunks } from '@fastgpt/global/common/string/textSplitter';
import { addLog } from '@fastgpt/service/common/system/log';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { NextApiRequest } from 'next';

type SplitProps = {
  text: string;
  chunkSize: number;
  overlapRatio?: number;
  chunkSplitter?: string;
};

async function handler(req: NextApiRequest) {
  const { text, chunkSize = 1024, overlapRatio = 0.2, chunkSplitter } = req.body as SplitProps;

  if (!text) {
    return Promise.reject(CommonErrEnum.missingParams);
  }

  await authCert({ req, authToken: true, authApiKey: true });

  const { chunks } = splitText2Chunks({
    text,
    chunkLen: chunkSize,
    overlapRatio: overlapRatio,
    customReg: chunkSplitter ? [chunkSplitter] : []
  });

  return chunks;
}

export default NextAPI(handler);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: '10mb'
  }
};
