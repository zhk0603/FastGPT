import { ErrType } from '../errorCode';

/* dataset: 506000 */
export enum OpenApiErrEnum {
  unExist = 'openapiUnExist',
  unAuth = 'openapiUnAuth',
  exceedLimit = 'openapiExceedLimit'
}
const errList = [
  {
    statusText: OpenApiErrEnum.unExist,
    message: 'Api Key 不存在'
  },
  {
    statusText: OpenApiErrEnum.unAuth,
    message: '无权操作该 Api Key'
  },
  {
    statusText: OpenApiErrEnum.exceedLimit,
    message: '最多 10 组 API 密钥'
  }
];
export default errList.reduce((acc, cur, index) => {
  return {
    ...acc,
    [cur.statusText]: {
      code: 506000 + index,
      statusText: cur.statusText,
      message: cur.message,
      data: null
    }
  };
}, {} as ErrType<`${OpenApiErrEnum}`>);
