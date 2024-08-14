import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { loginByToken, getSdkPublicKey } from '@/web/support/uni/api';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const API_BASE_URL = 'http://192.168.0.58:9902';

const AuthRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { token } = router.query;
      
      if (typeof token === 'string') {
        try {
          let PUBLIC_KEY: string;
          try {
            // 获取公钥
            console.log("开始请求公钥")
            const result = await getSdkPublicKey(API_BASE_URL, 'FASTGPT');
            PUBLIC_KEY =
              "-----BEGIN PUBLIC KEY-----\n" +
              result +
              "\n-----END PUBLIC KEY-----";
          } catch (error) {
            console.error('公钥获取错误');
            throw new Error('公钥获取错误, 请联系管理员');
          }

          // 解析token
          console.log("开始解析RSA")
          let jwtTokenBuffer: Buffer;
          try {
            jwtTokenBuffer = decryptLargeData(Buffer.from(token, 'base64'), PUBLIC_KEY);
          } catch (error) {
            console.error('RSA解密错误');
            throw new Error('RSA解密错误, 请联系管理员');
          }

          console.log("开始解析JWT")
          let userId: string;
          try {
            userId = getUserIdFromToken(jwtTokenBuffer.toString("utf-8"));
          } catch (error) {
            console.error('jwt解密错误');
            throw new Error('jwt解密错误, 请联系管理员');
          }

          // 设置 token 到 header 中
          console.log("后台静默登录")
          loginByToken(userId);
          // 跳转到 app/list 页面
          router.push('/app/list');
        } catch (error) {
          router.push('/login')
        }
      } else {
        // 如果没有 token，可以跳转到登录页面或显示错误
        console.error('No token provided');
        router.push('/login'); // 或者显示一个错误页面
      }
    };

    // 确保路由已经准备好
    if (router.isReady) {
      handleAuth();
    }
  }, [router]);

  // 渲染一个加载指示器或者空白页面
  return <div>登录中...</div>;
};

function getUserIdFromToken(token: string): string {
  try {
    const decoded = jwt.decode(token);

    if (decoded && typeof decoded === 'object' && 'userid' in decoded) {
      return decoded.userid as string;
    }
    return '';
  } catch (error) {
    console.error('Error decoding token:', error);
    return '';
  }
}

function decryptLargeData(encryptedData: Buffer, publicKey: string): Buffer {
  const chunkSize = 128; // 1024 位 RSA 密钥的块大小
  let decrypted = Buffer.alloc(0);

  for (let i = 0; i < encryptedData.length; i += chunkSize) {
    const chunk = encryptedData.slice(i, i + chunkSize);
    try {
      const decryptedChunk = crypto.publicDecrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        chunk
      );
      decrypted = Buffer.concat([decrypted, decryptedChunk]);
    } catch (error) {
      console.error(`Error decrypting chunk starting at byte ${i}:`, error);
    }
  }

  return decrypted;
}

export default AuthRedirect;