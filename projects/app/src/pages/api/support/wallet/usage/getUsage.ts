import type { NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { RequestPaging } from '@/types';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { addDays } from 'date-fns';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoUsage } from '@fastgpt/service/support/wallet/usage/schema';

export type GetGetUsageParams = RequestPaging & {
  dateEnd: Date;
  dateStart: Date;
  source: string;
  teamMemberId: string;
};

export default async function handler(
  req: ApiRequestProps<GetGetUsageParams>,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();
    const { teamId } = await authCert({ req, authToken: true, per: ManagePermissionVal });
    const {
      dateStart = addDays(new Date(), -7),
      dateEnd = new Date(),
      source,
      teamMemberId,
      pageNum,
      pageSize
    } = req.body;
    const where: any = {
      teamId: new Types.ObjectId(teamId),
      tmbId: new Types.ObjectId(teamMemberId),
      time: {
        $gte: new Date(dateStart),
        $lte: new Date(dateEnd)
      }
    };

    if (source) {
      where.source = source;
    }

    const [data, total] = await Promise.all([
      MongoUsage.aggregate([
        { $match: where }, // 过滤条件
        { $sort: { time: -1 } }, // 按更新时间降序排序
        { $skip: (pageNum - 1) * pageSize }, // 跳过前面的文档，用于分页
        { $limit: pageSize }, // 限制返回的文档数量，用于分页
        {
          $project: {
            // 选择要返回的字段
            _id: 0,
            id: '$_id',
            teamId: 1,
            tmbId: 1,
            source: 1,
            appName: 1,
            totalPoints: 1,
            list: 1,
            time: 1
          }
        }
      ]),
      MongoUsage.countDocuments(where)
    ]);

    jsonRes(res, {
      data: {
        pageNum,
        pageSize,
        data: data,
        total: total
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
