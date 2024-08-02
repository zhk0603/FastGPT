import { delay } from '@fastgpt/global/common/system/utils';
import { addLog } from '@fastgpt/service/common/system/log';
import { correctedPageOptions, ExtractorOptions, firecrawlApp, PageOptions } from '../utils';

type Props = {
  url: string;
  pageOptions: PageOptions;
  extractorOptions: ExtractorOptions;
};

// Response type same as HTTP outputs
type Response = Promise<{
  result: string;
  metadata?: any;
}>;

const main = async (props: Props, retry = 3): Response => {
  const { url, pageOptions } = props;
  try {
    correctedPageOptions(pageOptions);
    addLog.debug('props', props);

    const result = await firecrawlApp.scrapeUrl(url, {
      pageOptions
    });
    // addLog.debug('result', result);
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
