type Props = {
  milliseconds: number;
};

//  模拟休眠函数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async ({ milliseconds }: Props): Promise<void> => {
  //  执行休眠
  await sleep(milliseconds);
  return;
};

export default main;
