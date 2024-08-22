import { PluginSourceEnum } from '@fastgpt/global/core/plugin/constants';
import { SystemPluginResponseType } from './type';
import { FastGPTProUrl, FirecrawlUrl, isProduction } from '../service/common/system/constants';
import { GET, POST } from '@fastgpt/service/common/api/plusRequest';
import { SystemPluginTemplateItemType } from '@fastgpt/global/core/workflow/type';
import { cloneDeep } from 'lodash';
import { WorkerNameEnum, runWorker } from '@fastgpt/service/worker/utils';

// Run in main thread
const staticPluginList = [
  'getTime',
  'fetchUrl',
  'Doc2X',
  'Doc2X/URLPDF2text',
  'Doc2X/URLImg2text',
  `Doc2X/FilePDF2text`,
  `Doc2X/FileImg2text`,
  'feishu'
];
// Run in worker thread (Have npm packages)
const packagePluginList = [
  'mathExprVal',
  'duckduckgo',
  'duckduckgo/search',
  'duckduckgo/searchImg',
  'duckduckgo/searchNews',
  'duckduckgo/searchVideo'
];

if (FirecrawlUrl) {
  packagePluginList.push(
    'firecrawl',
    'firecrawl/scrape',
    'firecrawl/search',
    'firecrawl/crawl',
    'firecrawl/crawlJob'
  );
}

export const list = [...staticPluginList, ...packagePluginList];

/* Get plugins */
export const getCommunityPlugins = () => {
  return list.map<SystemPluginTemplateItemType>((name) => {
    const config = require(`./src/${name}/template.json`);

    const isFolder = list.find((item) => item.startsWith(`${name}/`));

    const parentIdList = name.split('/').slice(0, -1);
    const parentId =
      parentIdList.length > 0 ? `${PluginSourceEnum.community}-${parentIdList.join('/')}` : null;

    return {
      ...config,
      id: `${PluginSourceEnum.community}-${name}`,
      isFolder,
      parentId,
      isActive: true
    };
  });
};

export const getSystemPluginTemplates = () => {
  const oldPlugins = global.communityPlugins ?? [];
  return [...oldPlugins, ...cloneDeep(global.systemPlugins || [])];
};

export const getCommunityCb = async () => {
  const loadCommunityModule = async (name: string) => {
    const module = await import(`./src/${name}/index`);
    return module.default;
  };

  const result = (
    await Promise.all(
      list.map(async (name) => {
        try {
          return {
            name,
            cb: staticPluginList.includes(name)
              ? await loadCommunityModule(name)
              : (e: any) => {
                  return runWorker(WorkerNameEnum.systemPluginRun, {
                    pluginName: name,
                    data: e
                  });
                }
          };
        } catch (error) {}
      })
    )
  ).filter(Boolean) as {
    name: string;
    cb: any;
  }[];

  return result.reduce<Record<string, (e: any) => SystemPluginResponseType>>(
    (acc, { name, cb }) => {
      acc[name] = cb;
      return acc;
    },
    {}
  );
};

export const getSystemPluginCb = async () => {
  return global.systemPluginCb;
};
