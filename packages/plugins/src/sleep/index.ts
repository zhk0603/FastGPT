import { NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';

type Props = {
  milliseconds: number;
};

//  模拟休眠函数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Response = Promise<{
  [NodeInputKeyEnum.answerText]: string;
}>;

const main = async ({ milliseconds }: Props): Response => {
  //  执行休眠
  await sleep(milliseconds);
  return {
    [NodeInputKeyEnum.answerText]: ''
  };
};

export default main;
