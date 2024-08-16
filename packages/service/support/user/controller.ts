import { UserType, UniUserType } from '@fastgpt/global/support/user/type';
import { MongoUser } from './schema';
import { getTmbInfoByTmbId, getUserDefaultTeam } from './team/controller';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';

export async function authUserExist({ userId, username }: { userId?: string; username?: string }) {
  if (userId) {
    return MongoUser.findOne({ _id: userId });
  }
  if (username) {
    return MongoUser.findOne({ username });
  }
  return null;
}

export async function getUserDetail({
  tmbId,
  userId
}: {
  tmbId?: string;
  userId?: string;
}): Promise<UserType> {
  const tmb = await (async () => {
    if (tmbId) {
      try {
        const result = await getTmbInfoByTmbId({ tmbId });
        return result;
      } catch (error) {}
    }
    if (userId) {
      return getUserDefaultTeam({ userId });
    }
    return Promise.reject(ERROR_ENUM.unAuthorization);
  })();
  const user = await MongoUser.findById(tmb.userId);

  if (!user) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  return {
    _id: user._id,
    username: user.username,
    avatar: user.avatar,
    timezone: user.timezone,
    promotionRate: user.promotionRate,
    openaiAccount: user.openaiAccount,
    team: tmb,
    notificationAccount: tmb.notificationAccount,
    permission: tmb.permission
  };
}

interface DataPager<T> {
  records: T[];
  total: number;
}

export async function getUserLists(pageIndex: number, pageSize: number)
: Promise<DataPager<UniUserType>> {
  try {
    const skip = (pageIndex - 1) * pageSize;

    const users = formatUserData(await MongoUser.find()
      .select('+password')
      .skip(skip)
      .limit(pageSize)
      .exec());
    const totalCount = await MongoUser.countDocuments();

    return {
      records: users,
      total: totalCount
    };
  } catch (error) {
    console.error('分页查询用户出错:', error, pageIndex, pageSize);
    // 返回空结果集
    return {
      records: [],
      total: 0
    };
  }
}

function formatUserData(users: any[]): UniUserType[] {
  console.log("users", users)
  return users.map(user => {
    const formattedUser: UniUserType = {
      userId: user._id.toString(),
      userName: user.username,
      loginName: user.username,
      password: user.password,
    };

    if (user.avatar) formattedUser.avatar = user.avatar;
    if (user.status) formattedUser.status = user.status;
    if (user.promotionRate !== undefined) formattedUser.promotionRate = user.promotionRate;
    if (user.timezone) formattedUser.timezone = user.timezone;
    if (user.createTime) formattedUser.createTime = new Date(user.createTime);
    return formattedUser;
  });
}