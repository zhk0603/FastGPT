import { NextAPI } from '@/service/middleware/entry';
import { getUserLists } from '@fastgpt/service/support/user/controller';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

export type TokenLoginQuery = {};
export type TokenLoginBody = {};
export type TokenLoginResponse = {};
export type ExecuteCoreQuery = {};

export interface SyncParams {
  pageIndex?: number;
  pageSize?: number;
  userId?: string;
  syncType?: number;
  labelCode?: string;
}

export type ExecuteCoreBody = SyncParams;

async function getSysInfo(
  req: ApiRequestProps<ExecuteCoreBody, ExecuteCoreQuery>,
  _res: ApiResponseType<any>
): Promise<TokenLoginResponse> {
  // sdk中默认参数
  let pageIndex = 1;
  let pageSize = 100;

  if (req.body.pageIndex && req.body.pageSize) {
    pageIndex = req.body.pageIndex;
    pageSize = req.body.pageSize;
  }

  switch (req.body.syncType) {
    case 100001:
      return getUserLists(pageIndex, pageSize);
    default:
      // 目前只有查找用户一种情况
      return {};
  }
}

export default NextAPI(getSysInfo);