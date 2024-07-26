import type { NextApiRequest } from 'next';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { NextAPI } from '@/service/middleware/entry';
import { getCommunityPlugins } from '@fastgpt/plugins/register';
import { SystemPluginTemplateItemType } from '@fastgpt/global/core/workflow/type';

async function handler(req: NextApiRequest): Promise<SystemPluginTemplateItemType[]> {
  return await getCommunityPlugins();
}

export default NextAPI(handler);
