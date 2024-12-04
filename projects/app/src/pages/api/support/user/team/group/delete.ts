import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { NextAPI } from '@/service/middleware/entry';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoGroupMemberModel } from '@fastgpt/service/support/permission/memberGroup/groupMemberSchema';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await connectToDatabase();

  const { teamId } = await authCert({ req, authToken: true });

  let { groupId } = req.query as {
    groupId: string;
  };

  await mongoSessionRun(async (session) => {
    // 删除权限
    await MongoResourcePermission.findOneAndDelete({
      teamId,
      groupId
    });
    // 删除团队成员
    await MongoGroupMemberModel.deleteMany(
      {
        groupId
      },
      {
        session
      }
    );
    // 删除group
    await MongoMemberGroupModel.findByIdAndRemove(groupId, {
      session
    });
  });
}

export default NextAPI(handler);
