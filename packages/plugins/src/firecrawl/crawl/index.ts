import { delay } from '@fastgpt/global/common/system/utils';
import { addLog } from '@fastgpt/service/common/system/log';
import {
  correctedCrawlerOptions,
  correctedPageOptions,
  CrawlerOptions,
  firecrawlApp,
  PageOptions
} from '../utils';

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

const main = async (props: Props, retry = 3): Response => {
  const { url, crawlerOptions, pageOptions } = props;
  correctedPageOptions(pageOptions);
  correctedCrawlerOptions(crawlerOptions);
  addLog.debug('props', props);
  try {
    const result = await firecrawlApp.crawlUrl(
      url,
      {
        crawlerOptions,
        pageOptions
      },
      false
    );

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
