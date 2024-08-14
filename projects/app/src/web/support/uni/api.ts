import { POST, GET } from '@/web/common/api/request';
import type { ResLogin } from '@/global/support/api/userRes.d';
import axios from 'axios';

// gpt登录接口
export const loginByToken = ( userId : String) =>
  POST<ResLogin>('/base/loginByToken', { userId });

// uni获取公钥接口
export const getSdkPublicKey = async (url: string, systemCode: string): Promise<string> => {
  const response = await axios.get(`${url}/getSdkPublicKey?systemCode=${systemCode}`, {timeout: 6000});
  if (response.status !== 200) {
    throw new Error('Failed to fetch public key');
  }
  return response.data.data;
};