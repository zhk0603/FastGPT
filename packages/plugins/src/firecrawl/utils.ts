import { FirecrawlKey, FirecrawlUrl } from '@fastgpt/service/common/system/constants';
import FirecrawlApp from '@mendable/firecrawl-js';

export type PageOptions = {
  headers: any;
  includeHtml: boolean;
  includeRawHtml: boolean;
  onlyIncludeTags?: string | string[];
  onlyMainContent: boolean;
  removeTags?: string | string[];
  replaceAllPathsWithAbsolutePaths: boolean;
  screenshot: boolean;
  waitFor: number;
};

export type SearchPageOptions = {
  onlyMainContent: boolean;
  fetchPageContent: boolean;
  includeHtml: boolean;
  includeRawHtml: boolean;
};

export type SearchOptions = {
  limit: number;
  lang: string;
  country: string;
};

export type CrawlerOptions = {
  includes?: string | string[];
  excludes?: string | string[];
  generateImgAltText: boolean;
  returnOnlyUrls: boolean;
  maxDepth?: number;
  mode?: string;
  ignoreSitemap: boolean;
  limit?: number;
  allowBackwardCrawling: boolean;
  allowExternalContentLinks: boolean;
};

export type ExtractorOptions = {
  mode: string;
  extractionPrompt: string;
  extractionSchema: any;
};

export const firecrawlApp = new FirecrawlApp({
  apiUrl: FirecrawlUrl,
  apiKey: FirecrawlKey || 'any'
});

function strToArr(str: any) {
  if (str && typeof str === 'string') {
    return str.split(',');
  }

  return undefined;
}

function strToObj(str: any) {
  if (str && typeof str === 'string') {
    return JSON.parse(str);
  }

  return undefined;
}

export function correctedPageOptions(pageOptions: PageOptions) {
  const { headers, onlyIncludeTags, removeTags } = pageOptions;
  pageOptions.headers = strToObj(headers);
  pageOptions.onlyIncludeTags = strToArr(onlyIncludeTags);
  pageOptions.removeTags = strToArr(removeTags);
}

export function correctedCrawlerOptions(crawlerOptions: CrawlerOptions) {
  const { includes, excludes, mode, maxDepth, limit } = crawlerOptions;
  crawlerOptions.includes = strToArr(includes);
  crawlerOptions.excludes = strToArr(excludes);
  crawlerOptions.mode = mode || undefined;
  crawlerOptions.maxDepth = maxDepth || undefined;
  crawlerOptions.limit = limit || undefined;
}
