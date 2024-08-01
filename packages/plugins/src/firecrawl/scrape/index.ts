import { delay } from '@fastgpt/global/common/system/utils';
import { FirecrawlKey, FirecrawlUrl } from '@fastgpt/service/common/system/constants';
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

type ExtractorOptions = {
  mode: string;
  extractionPrompt: string;
  extractionSchema: any;
};

type Props = {
  url: string;
  pageOptions: PageOptions;
  extractionSchema: ExtractorOptions;
};

// Response type same as HTTP outputs
type Response = Promise<{
  result: string;
  metadata?: any;
}>;

// Initialize the FirecrawlApp with your API key
const app = new FirecrawlApp({ apiUrl: FirecrawlUrl, apiKey: FirecrawlKey || 'any' });

const main = async (props: Props, retry = 3): Response => {
  const { url, pageOptions } = props;
  addLog.debug('props', props);
  try {
    const { headers } = pageOptions;
    if (headers) {
      pageOptions.headers = JSON.parse(headers);
    }

    const result = await app.scrapeUrl(url, {
      pageOptions
    });
    addLog.debug('result', result);
    return {
      result: result.data?.markdown || 'Failed to fetch data',
      metadata: result.data?.metadata
    };
  } catch (error) {
    if (retry <= 0) {
      addLog.warn('Firecrawl error', { error });
      return {
        result: 'Failed to fetch data'
      };
    }

    await delay(Math.random() * 5000);
    return main(props, retry - 1);
  }
};

export default main;
