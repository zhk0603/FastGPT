import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { MongoGroupMemberModel } from './groupMemberSchema';
import { MongoMemberGroupModel } from './memberGroupSchema';
import {
  MemberGroupListType,
  MemberGroupType
} from '@fastgpt/global/support/permission/memberGroup/type';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';
import { MongoResourcePermission } from '../schema';

export async function getTeamGroupList(teamId: string) {
  var groups = await MongoMemberGroupModel.find({
    teamId
  });
  let groupIds = groups.map((group) => group._id);
  let groupMembers = await MongoGroupMemberModel.find({
    groupId: { $in: groupIds }
  });

  const memberGroupList = await Promise.all(
    groups.map(async (group) => {
      const members = groupMembers
        .filter((member) => member.groupId.toString() === group._id.toString())
        .map((member) => ({
          tmbId: member.tmbId.toString(),
          role: member.role
        }));

      const groupPer = await getGroupPermission(teamId, group._id);

      return {
        _id: group._id.toString(),
        teamId: group.teamId.toString(),
        name: group.name,
        avatar: group.avatar || '',
        updateTime: group.updateTime,
        members: members,
        permission: new TeamPermission({
          per: groupPer,
          isOwner: false
        })
      } as MemberGroupType;
    })
  );

  return memberGroupList;
}

export async function getGroupPermission(teamId: string, groupId: string) {
  const per = await MongoResourcePermission.findOne({
    teamId,
    groupId
  });
  return per?.permission;
}
