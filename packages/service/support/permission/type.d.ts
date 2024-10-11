import { Permission } from '@fastgpt/global/support/permission/controller';
import { ApiRequestProps } from '../../type/next';
import type { PermissionValueType } from '@fastgpt/global/support/permission/type';
import { RequireAtLeastOne } from '@fastgpt/global/common/type/utils';

export type ReqHeaderAuthType = {
  cookie?: string;
  token?: string;
  apikey?: string; // abandon
  rootkey?: string;
  userid?: string;
  authorization?: string;
};

type authModeType = {
  req: ApiRequestProps;
  authToken?: boolean;
  authRoot?: boolean;
  authApiKey?: boolean;
  per?: PermissionValueType;
};

export type AuthModeType = RequireAtLeastOne<authModeType, 'authApiKey' | 'authRoot' | 'authToken'>;

export type AuthResponseType<T extends Permission = Permission> = {
  teamId: string;
  tmbId: string;
  authType?: `${AuthUserTypeEnum}`;
  appId?: string;
  apikey?: string;
  permission: T;
};
