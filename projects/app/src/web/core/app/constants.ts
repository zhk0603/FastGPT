import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { AppDetailType } from '@fastgpt/global/core/app/type.d';
import type { FeishuAppType, OutLinkEditType } from '@fastgpt/global/support/outLink/type.d';
import { AppPermission } from '@fastgpt/global/support/permission/app/controller';
import { NullPermission } from '@fastgpt/global/support/permission/constant';
import { i18nT } from '@fastgpt/web/i18n/utils';
export const defaultApp: AppDetailType = {
  _id: '',
  name: i18nT('common:core.app.loading'),
  type: AppTypeEnum.simple,
  avatar: '/icon/logo.svg',
  intro: '',
  updateTime: new Date(),
  modules: [],
  chatConfig: {},
  teamId: '',
  tmbId: '',
  teamTags: [],
  edges: [],
  version: 'v2',
  defaultPermission: NullPermission,
  permission: new AppPermission(),
  inheritPermission: false
};

export const defaultOutLinkForm: OutLinkEditType = {
  name: '',
  responseDetail: false,
  limit: {
    QPM: 100,
    maxUsagePoints: -1
  }
};

export const defaultFeishuOutLinkForm: OutLinkEditType<FeishuAppType> = {
  name: '',
  limit: {
    QPM: 100,
    maxUsagePoints: -1
  }
};

export enum TTSTypeEnum {
  none = 'none',
  web = 'web',
  model = 'model'
}
