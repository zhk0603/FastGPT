export const FastGPTProUrl = process.env.PRO_URL ? `${process.env.PRO_URL}/api` : '';

export const isProduction = process.env.NODE_ENV === 'production';

export const FirecrawlUrl = process.env.FIRECRAWL_URL;
export const FirecrawlKey = process.env.FIRECRAWL_KEY;
