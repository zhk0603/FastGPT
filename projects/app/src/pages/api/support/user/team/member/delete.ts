import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    const { teamId } = await authUserPer({ req, authToken: true, per: ManagePermissionVal });

    const { tmbId } = req.query as { tmbId: string };
    if (tmbId == null) {
      throw new Error('tmbId is not null!');
    }

    await mongoSessionRun(async (session) => {
      await MongoTeamMember.deleteOne(
        {
          _id: tmbId
        },
        { session }
      );

      await MongoResourcePermission.deleteMany(
        {
          teamId,
          tmbId
        },
        { session }
      );
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
