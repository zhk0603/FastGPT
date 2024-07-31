import { delay } from '@fastgpt/global/common/system/utils';
import { addLog } from '@fastgpt/service/common/system/log';
import FirecrawlApp from '@mendable/firecrawl-js';

type PageOptions = {
  headers: any;
  includeHtml: boolean;
  includeRawHtml: boolean;
  onlyIncludeTags: string;
  onlyMainContent: boolean;
  removeTags: string;
  replaceAllPathsWithAbsolutePaths: boolean;
  screenshot: boolean;
  waitFor: number;
};

type CrawlerOptions = {
  includes: string;
  excludes: string;
  generateImgAltText: boolean;
  returnOnlyUrls: boolean;
  maxDepth: number;
  mode: string;
  ignoreSitemap: boolean;
  limit: number;
  allowBackwardCrawling: boolean;
  allowExternalContentLinks: boolean;
};

type Props = {
  url: string;
  crawlerOptions: CrawlerOptions;
  pageOptions: PageOptions;
};

// Response type same as HTTP outputs
type Response = Promise<{
  jobId?: string;
  msg: string;
}>;

// Initialize the FirecrawlApp with your API key
const app = new FirecrawlApp({ apiUrl: 'http://192.168.3.250:23002', apiKey: 'any' });

const main = async (props: Props, retry = 3): Response => {
  const { url, crawlerOptions, pageOptions } = props;
  try {
    const result = await app.crawlUrl(url, {
      crawlerOptions,
      pageOptions
    });

    return {
      jobId: result.jobId,
      msg: 'Successful'
    };
  } catch (error) {
    if (retry <= 0) {
      addLog.warn('Firecrawl error', { error });
      return {
        msg: 'Failed to crawl data'
      };
    }

    await delay(Math.random() * 5000);
    return main(props, retry - 1);
  }
};

export default main;
