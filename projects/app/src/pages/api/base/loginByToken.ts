import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { createJWT, setCookie } from '@fastgpt/service/support/permission/controller';
import { connectToDatabase } from '@/service/mongo';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import type { PostLoginProps } from '@fastgpt/global/support/user/api.d';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("loginByToken")
    console.log("req.body: ", req.body);
    console.log("req.method: ", req.method);
    console.log("Content-Type: ", req.headers['content-type']);
    await connectToDatabase();
    const { userId } = req.body;
    console.log("userId: ", userId)
    if (!userId) {
      throw new Error('缺少参数1');
    }

    // 检测用户是否存在
    const user = await MongoUser.findById(userId, 'status');
    if (!user) {
      throw new Error('用户未注册');
    }

    if (user.status === UserStatusEnum.forbidden) {
      throw new Error('账号已停用，无法登录');
    }

    // 用户名登录，不校验密码

    const userDetail = await getUserDetail({
      tmbId: user?.lastLoginTmbId,
      userId: user._id
    });

    MongoUser.findByIdAndUpdate(user._id, {
      lastLoginTmbId: userDetail.team.tmbId
    });

    const token = createJWT(userDetail);
    setCookie(res, token);

    jsonRes(res, {
      data: {
        user: userDetail,
        token
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
