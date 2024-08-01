import { delay } from '@fastgpt/global/common/system/utils';
import { FirecrawlKey, FirecrawlUrl } from '@fastgpt/service/common/system/constants';
import { addLog } from '@fastgpt/service/common/system/log';
import FirecrawlApp from '@mendable/firecrawl-js';

type PageOptions = {
  includeHtml: boolean;
  includeRawHtml: boolean;
  onlyMainContent: boolean;
  fetchPageContent: boolean;
};

type SearchOptions = {
  limit: number;
  lang: string;
  country: string;
};

type Props = {
  query: string;
  pageOptions: PageOptions;
  searchOptions: SearchOptions;
};

// Response type same as HTTP outputs
type Response = Promise<{
  data: any;
}>;

// Initialize the FirecrawlApp with your API key
const app = new FirecrawlApp({ apiUrl: FirecrawlUrl, apiKey: FirecrawlKey || 'any' });

const main = async (props: Props, retry = 3): Response => {
  const { query, pageOptions, searchOptions } = props;
  addLog.debug('search props', props);
  try {
    const result = await app.search(query, {
      pageOptions,
      searchOptions
    });
    addLog.debug('search result', result);
    return {
      data:
        result.data?.map((item) => ({
          markdown: item.markdown,
          metadata: {
            title: item.metadata.title,
            description: item.metadata.description,
            sourceURL: item.metadata.sourceURL,
            pageStatusCode: item.metadata.pageStatusCode
          }
        })) || 'Failed to fetch data'
    };
  } catch (error) {
    if (retry <= 0) {
      addLog.warn('Firecrawl error', { error });
      return {
        data: 'Failed to fetch data'
      };
    }

    await delay(Math.random() * 5000);
    return main(props, retry - 1);
  }
};

export default main;
