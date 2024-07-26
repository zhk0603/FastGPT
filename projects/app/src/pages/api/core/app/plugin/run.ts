import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { getCommunityCb } from '@fastgpt/plugins/register';

async function handler(req: NextApiRequest): Promise<any> {
  return await getCommunityCb();
}

export default NextAPI(handler);
