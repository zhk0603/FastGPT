import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { AuthOpenApiLimitProps } from '@fastgpt/service/support/openapi/auth';
import { addLog } from '@fastgpt/service/common/system/log';

async function handler(req: ApiRequestProps<AuthOpenApiLimitProps>): Promise<void> {
  const { openApi } = req.body;
  addLog.debug('openApi: ', openApi);
}

export default NextAPI(handler);
