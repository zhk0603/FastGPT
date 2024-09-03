import type { ModuleDispatchProps } from '@fastgpt/global/core/workflow/runtime/type';
import {
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '@fastgpt/global/core/workflow/constants';
import {
  DispatchNodeResponseKeyEnum,
  SseResponseEventEnum
} from '@fastgpt/global/core/workflow/runtime/constants';
import axios from 'axios';
import { formatHttpError, valueTypeFormat } from '../utils';
import { SERVICE_LOCAL_HOST } from '../../../../common/system/tools';
import { addLog } from '../../../../common/system/log';
import { DispatchNodeResultType } from '@fastgpt/global/core/workflow/runtime/type';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { textAdaptGptResponse } from '@fastgpt/global/core/workflow/runtime/utils';
import { getSystemPluginCb } from '../../../../../plugins/register';
const qs = require('qs');

type PropsArrType = {
  key: string;
  type: string;
  value: string;
};
type HttpRequestProps = ModuleDispatchProps<{
  [NodeInputKeyEnum.abandon_httpUrl]: string;
  [NodeInputKeyEnum.httpMethod]: string;
  [NodeInputKeyEnum.httpReqUrl]: string;
  [NodeInputKeyEnum.httpHeaders]: PropsArrType[];
  [NodeInputKeyEnum.httpParams]: PropsArrType[];
  [NodeInputKeyEnum.httpJsonBody]: string;
  [NodeInputKeyEnum.addInputParam]: Record<string, any>;
  [NodeInputKeyEnum.httpTimeout]?: number;
  [key: string]: any;
}>;
type HttpResponse = DispatchNodeResultType<{
  [NodeOutputKeyEnum.error]?: object;
  [key: string]: any;
}>;

const UNDEFINED_SIGN = 'null';

export const dispatchHttp468Request = async (props: HttpRequestProps): Promise<HttpResponse> => {
  let {
    runningAppInfo: { id: appId },
    chatId,
    responseChatItemId,
    variables,
    node: { outputs },
    histories,
    workflowStreamResponse,
    params: {
      system_httpMethod: httpMethod = 'POST',
      system_httpReqUrl: httpReqUrl,
      system_httpHeader: httpHeader,
      system_httpParams: httpParams = [],
      system_httpJsonBody: httpJsonBody,
      system_httpTimeout: httpTimeout = 60,
      [NodeInputKeyEnum.addInputParam]: dynamicInput,
      ...body
    }
  } = props;

  if (!httpReqUrl) {
    return Promise.reject('Http url is empty');
  }

  const systemVariables = {
    appId,
    chatId,
    responseChatItemId,
    histories: histories?.slice(-10) || []
  };
  const concatVariables = {
    ...variables,
    ...body,
    // ...dynamicInput,
    ...systemVariables
  };

  const allVariables = {
    [NodeInputKeyEnum.addInputParam]: concatVariables,
    ...concatVariables
  };

  httpReqUrl = replaceVariable(httpReqUrl, allVariables);
  // parse header
  const headers = await (() => {
    try {
      if (!httpHeader || httpHeader.length === 0) return {};
      // array
      return httpHeader.reduce((acc: Record<string, string>, item) => {
        const key = replaceVariable(item.key, allVariables);
        const value = replaceVariable(item.value, allVariables);
        acc[key] = valueTypeFormat(value, WorkflowIOValueTypeEnum.string);
        return acc;
      }, {});
    } catch (error) {
      return Promise.reject('Header 为非法 JSON 格式');
    }
  })();
  const params = httpParams.reduce((acc: Record<string, string>, item) => {
    const key = replaceVariable(item.key, allVariables);
    const value = replaceVariable(item.value, allVariables);
    acc[key] = valueTypeFormat(value, WorkflowIOValueTypeEnum.string);
    return acc;
  }, {});

  const requestBody = await (() => {
    if (!httpJsonBody) return {};
    try {
      // Replace all variables in the string body
      httpJsonBody = replaceVariable(httpJsonBody, allVariables);

      // Text body, return directly
      if (headers['Content-Type']?.includes('text/plain')) {
        return httpJsonBody?.replaceAll(UNDEFINED_SIGN, 'null');
      }

      // Json body, parse and return
      const jsonParse = JSON.parse(httpJsonBody);
      const removeSignJson = removeUndefinedSign(jsonParse);
      return removeSignJson;
    } catch (error) {
      console.log(error);
      return Promise.reject(`Invalid JSON body: ${httpJsonBody}`);
    }
  })();

  try {
    const { formatResponse, rawResponse, httpHeader } = await (async () => {
      const systemPluginCb = await getSystemPluginCb();
      if (systemPluginCb[httpReqUrl]) {
        const pluginResult = await systemPluginCb[httpReqUrl](requestBody);
        return {
          formatResponse: pluginResult,
          rawResponse: pluginResult,
          httpHeader: null
        };
      }
      return fetchData({
        method: httpMethod,
        url: httpReqUrl,
        headers,
        body: requestBody,
        params,
        timeout: httpTimeout
      });
    })();

    // format output value type
    const results: Record<string, any> = {};
    for (const key in formatResponse) {
      const output = outputs.find((item) => item.key === key);
      if (!output) continue;
      results[key] = valueTypeFormat(formatResponse[key], output.valueType);
    }

    if (typeof formatResponse[NodeOutputKeyEnum.answerText] === 'string') {
      workflowStreamResponse?.({
        event: SseResponseEventEnum.fastAnswer,
        data: textAdaptGptResponse({
          text: formatResponse[NodeOutputKeyEnum.answerText]
        })
      });
    }

    return {
      [DispatchNodeResponseKeyEnum.nodeResponse]: {
        totalPoints: 0,
        params: Object.keys(params).length > 0 ? params : undefined,
        body: Object.keys(requestBody).length > 0 ? requestBody : undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        httpResult: rawResponse
      },
      [DispatchNodeResponseKeyEnum.toolResponses]:
        Object.keys(results).length > 0 ? results : rawResponse,
      [NodeOutputKeyEnum.httpRawResponse]: rawResponse,
      [NodeOutputKeyEnum.httpHeader]: httpHeader,
      ...results
    };
  } catch (error) {
    addLog.error('Http request error', error);

    return {
      [NodeOutputKeyEnum.error]: formatHttpError(error),
      [DispatchNodeResponseKeyEnum.nodeResponse]: {
        params: Object.keys(params).length > 0 ? params : undefined,
        body: Object.keys(requestBody).length > 0 ? requestBody : undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        httpResult: { error: formatHttpError(error) }
      },
      [NodeOutputKeyEnum.httpRawResponse]: getErrText(error)
    };
  }
};

async function fetchData({
  method,
  url,
  headers,
  body,
  params,
  timeout
}: {
  method: string;
  url: string;
  headers: Record<string, any>;
  body: Record<string, any> | string;
  params: Record<string, any>;
  timeout: number;
}) {
  if (headers['Content-Type']) {
    const isUrlEncoded =
      headers['Content-Type'].toLowerCase().indexOf('application/x-www-form-urlencoded') > -1;
    if (isUrlEncoded) {
      body = qs.stringify(body);
    }
  }

  const { data: response, headers: httpHeader } = await axios({
    method,
    baseURL: `http://${SERVICE_LOCAL_HOST}`,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    timeout: timeout * 1000,
    params: params,
    data: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined
  });

  /*
    parse the json:
    {
      user: {
        name: 'xxx',
        age: 12
      },
      list: [
        {
          name: 'xxx',
          age: 50
        },
        [{ test: 22 }]
      ],
      psw: 'xxx'
    }

    result: {
      'user': { name: 'xxx', age: 12 },
      'user.name': 'xxx',
      'user.age': 12,
      'list': [ { name: 'xxx', age: 50 }, [ [Object] ] ],
      'list[0]': { name: 'xxx', age: 50 },
      'list[0].name': 'xxx',
      'list[0].age': 50,
      'list[1]': [ { test: 22 } ],
      'list[1][0]': { test: 22 },
      'list[1][0].test': 22,
      'psw': 'xxx'
    }
  */
  const parseJson = (obj: Record<string, any>, prefix = '') => {
    let result: Record<string, any> = {};

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        result[`${prefix}[${i}]`] = obj[i];

        if (Array.isArray(obj[i])) {
          result = {
            ...result,
            ...parseJson(obj[i], `${prefix}[${i}]`)
          };
        } else if (typeof obj[i] === 'object') {
          result = {
            ...result,
            ...parseJson(obj[i], `${prefix}[${i}].`)
          };
        }
      }
    } else if (typeof obj == 'object') {
      for (const key in obj) {
        result[`${prefix}${key}`] = obj[key];

        if (Array.isArray(obj[key])) {
          result = {
            ...result,
            ...parseJson(obj[key], `${prefix}${key}`)
          };
        } else if (typeof obj[key] === 'object') {
          result = {
            ...result,
            ...parseJson(obj[key], `${prefix}${key}.`)
          };
        }
      }
    }

    return result;
  };

  return {
    formatResponse:
      typeof response === 'object' && !Array.isArray(response) ? parseJson(response) : {},
    rawResponse: response,
    httpHeader: httpHeader
  };
}

function replaceVariable(text: string, obj: Record<string, any>) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      text = text.replace(new RegExp(`{{(${key})}}`, 'g'), UNDEFINED_SIGN);
    } else {
      const replacement = JSON.stringify(value);
      const unquotedReplacement =
        replacement.startsWith('"') && replacement.endsWith('"')
          ? replacement.slice(1, -1)
          : replacement;
      text = text.replace(new RegExp(`{{(${key})}}`, 'g'), () => unquotedReplacement);
    }
  }
  return text || '';
}
function removeUndefinedSign(obj: Record<string, any>) {
  for (const key in obj) {
    if (obj[key] === UNDEFINED_SIGN) {
      obj[key] = undefined;
    } else if (Array.isArray(obj[key])) {
      obj[key] = obj[key].map((item: any) => {
        if (item === UNDEFINED_SIGN) {
          return undefined;
        } else if (typeof item === 'object') {
          removeUndefinedSign(item);
        }
        return item;
      });
    } else if (typeof obj[key] === 'object') {
      removeUndefinedSign(obj[key]);
    }
  }
  return obj;
}
