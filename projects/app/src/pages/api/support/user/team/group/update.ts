import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { NextAPI } from '@/service/middleware/entry';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoGroupMemberModel } from '@fastgpt/service/support/permission/memberGroup/groupMemberSchema';

type MemberList = {
  role: string;
  tmbId: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await connectToDatabase();

  const { teamId } = await authCert({ req, authToken: true });

  let { avatar, name, groupId, memberList } = req.body as {
    avatar: string;
    name: string;
    groupId: string;
    memberList: MemberList[];
  };

  const exists = await MongoMemberGroupModel.findOne({
    _id: { $ne: groupId },
    teamId,
    name: name
  });
  if (exists) {
    return Promise.reject(TeamErrEnum.groupNameDuplicate);
  }

  await mongoSessionRun(async (session) => {
    // 更新group
    await MongoMemberGroupModel.findByIdAndUpdate(
      groupId,
      {
        name,
        avatar
      },
      {
        session
      }
    );

    // 获取当前组的所有成员
    const currentMembers = await MongoGroupMemberModel.find({ groupId }).session(session);

    // 将当前成员映射为一个以tmbId 为键的对象
    const currentMembersMap = new Map(currentMembers.map((member) => [member.tmbId, member]));

    // 处理请求中的成员列表
    for (const member of memberList) {
      if (currentMembersMap.has(member.tmbId)) {
        // 如果成员已存在，则更新
        await MongoGroupMemberModel.findOneAndUpdate(
          {
            groupId,
            tmbId: member.tmbId
          },
          { ...member, groupId },
          { session }
        );
        // 从 map 中移除已处理的成员
        currentMembersMap.delete(member.tmbId);
      } else {
        // 如果成员不存在，则创建
        await MongoGroupMemberModel.create([{ ...member, groupId }], { session });
      }
    }

    // 删除那些不在请求中的成员
    for (const [id] of currentMembersMap.entries()) {
      await MongoGroupMemberModel.findOneAndRemove(
        {
          groupId,
          tmbId: id
        },
        { session }
      );
    }
  });
}

export default NextAPI(handler);
