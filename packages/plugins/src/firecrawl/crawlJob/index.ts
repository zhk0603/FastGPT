import { delay } from '@fastgpt/global/common/system/utils';
import { addLog } from '@fastgpt/service/common/system/log';
import FirecrawlApp from '@mendable/firecrawl-js';
import axios from 'axios';

type Props = {
  jobId: string;
  operation: string;
};

// Response type same as HTTP outputs
type Response = Promise<{
  status?: string;
  msg: string;
  current?: number;
  total?: number;
  data?: any;
  partial_data?: any;
}>;

// Initialize the FirecrawlApp with your API key
const app = new FirecrawlApp({ apiUrl: 'http://192.168.3.250:23002', apiKey: 'any' });

const main = async (props: Props, retry = 3): Response => {
  const { jobId, operation } = props;
  try {
    if (operation === 'getdata') {
      const result = (await app.checkCrawlStatus(jobId)) as any;
      return {
        status: result.status,
        current: result.current,
        total: result.total,
        data: result.data?.map((item: any) => ({
          markdown: item.markdown,
          metadata: {
            title: item.metadata.title,
            description: item.metadata.description,
            sourceURL: item.metadata.sourceURL,
            pageStatusCode: item.metadata.pageStatusCode
          }
        })),
        partial_data: result.partial_data?.map((item: any) => ({
          markdown: item.markdown,
          metadata: {
            title: item.metadata.title,
            description: item.metadata.description,
            sourceURL: item.metadata.sourceURL,
            pageStatusCode: item.metadata.pageStatusCode
          }
        })),
        msg: 'Successful'
      };
    } else {
      const result = await axios.delete(`http://192.168.3.250:23002/v0/crawl/cancel/${jobId}`);
      return {
        status: result.data.status,
        msg: 'Successful'
      };
    }
  } catch (error) {
    if (retry <= 0) {
      addLog.warn('Firecrawl error', { error });
      return {
        msg: 'Failed to fetch data'
      };
    }

    await delay(Math.random() * 5000);
    return main(props, retry - 1);
  }
};

export default main;
