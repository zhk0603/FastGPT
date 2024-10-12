import {
  TeamTmbItemType,
  TeamMemberSchema,
  TeamMemberWithTeamAndUserSchema,
  TeamMemberWithTeamSchema
} from '@fastgpt/global/support/user/team/type';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import { MongoTeamMember } from './teamMemberSchema';
import { getResourcePermission } from '../../permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { mongoSessionRun } from '../../../common/mongo/sessionRun';
import { MongoResourcePermission } from '../../permission/schema';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';

async function getTeamMember(match: Record<string, any>): Promise<TeamTmbItemType> {
  const tmb = (await MongoTeamMember.findOne(match).populate('teamId')) as TeamMemberWithTeamSchema;
  if (!tmb) {
    return Promise.reject('member not exist');
  }

  const tmbPer = await getResourcePermission({
    resourceType: PerResourceTypeEnum.team,
    teamId: tmb.teamId._id,
    tmbId: tmb._id
  });

  return {
    userId: String(tmb.userId),
    teamId: String(tmb.teamId._id),
    teamName: tmb.teamId.name,
    memberName: tmb.name,
    avatar: tmb.teamId.avatar,
    balance: tmb.teamId.balance,
    tmbId: String(tmb._id),
    teamDomain: tmb.teamId?.teamDomain,
    role: tmb.role,
    status: tmb.status,
    defaultTeam: tmb.defaultTeam,
    lafAccount: tmb.teamId.lafAccount,
    permission: new TeamPermission({
      per: tmbPer ?? TeamDefaultPermissionVal,
      isOwner: tmb.role === TeamMemberRoleEnum.owner
    })
  };
}

async function getMemberInfo(match: Record<string, any>): Promise<any> {
  const tmb = (await MongoTeamMember.findOne(match)
    .populate('userId')
    .populate('teamId')) as TeamMemberWithTeamAndUserSchema;
  if (!tmb) {
    return Promise.reject('member not exist');
  }

  const tmbPer = await getResourcePermission({
    resourceType: PerResourceTypeEnum.team,
    teamId: tmb.teamId._id,
    tmbId: tmb._id
  });

  return {
    userId: String(tmb.userId._id),
    teamId: String(tmb.teamId),
    memberName: tmb.name,
    avatar: tmb.userId.avatar,
    tmbId: String(tmb._id),
    role: tmb.role,
    status: tmb.status,
    permission: new TeamPermission({
      per: tmbPer ?? TeamDefaultPermissionVal,
      isOwner: tmb.role === TeamMemberRoleEnum.owner
    })
  };
}

/**
 * 获取用户所有的team
 * @param param0
 * @returns
 */
export async function getTeamsInfoByUserId({
  userId,
  status
}: {
  userId: string;
  status: TeamMemberStatusEnum;
}): Promise<Array<TeamTmbItemType>> {
  if (!userId) {
    return Promise.reject('userId is required');
  }

  // 当前登录用户所有的 tmb
  var tmbs = await MongoTeamMember.find({
    userId,
    status
  });

  async function getAllTeamMembers(tmbs: Array<TeamMemberSchema>) {
    try {
      const promises = tmbs.map((tmb) =>
        getTeamMember({
          _id: tmb._id
        })
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  return await getAllTeamMembers(tmbs);
}

/**
 * 获取团队成员列表
 * @param teamId
 */
export async function getTeamMemberList(teamId: string) {
  // 团队下所有成员
  var tmbs = await MongoTeamMember.find({
    teamId
  }).populate('userId');

  async function getAllTeamMembers(tmbs: Array<TeamMemberSchema>) {
    try {
      const promises = tmbs.map((tmb) =>
        getMemberInfo({
          _id: tmb._id
        })
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  return await getAllTeamMembers(tmbs);
}

/**
 * 更新 tmb权限
 * @param param0
 */
export async function updateTmbsPer({
  teamId,
  permission,
  tmbIds
}: {
  teamId: string;
  permission: string;
  tmbIds: Array<string>;
}) {
  await mongoSessionRun(async (session) => {
    for (const tmbId of tmbIds) {
      const tmbPer = await MongoResourcePermission.findOneAndUpdate(
        {
          teamId,
          tmbId,
          resourceType: PerResourceTypeEnum.team
        },
        {
          permission
        },
        { session }
      );

      if (tmbPer == null) {
        // 不存在，创建
        await MongoResourcePermission.create(
          {
            teamId,
            tmbId,
            resourceType: PerResourceTypeEnum.team,
            permission
          },
          { session }
        );
      }
    }
  });
}
