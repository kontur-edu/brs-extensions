import * as ulearnApi from '../apis/ulearnApi';
import { Group, GroupPatch } from '../apis/ulearnApi';

export default async function copyGroupsAsync(
  courseId: string,
  groupNames: string[],
  destinationCourseId: string,
  renameGroup: (from: string) => string,
  makeMeOwner: boolean,
  scoringGroups: ulearnApi.ScoringGroup[],
  reviewMode: ReviewMode = 'perfect',
  isInviteLinkEnabled: boolean = false,
  canStudentsSeeGroupProgress: boolean = true
) {
  const existingGroups = await ulearnApi.getGroupsAsync(courseId);
  for (const groupName of groupNames) {
    const existingGroup = existingGroups.filter(g => g.name === groupName)[0];
    if (existingGroup) {
      await copyGroupAsync(
        existingGroup,
        destinationCourseId,
        renameGroup,
        makeMeOwner,
        scoringGroups,
        reviewMode,
        isInviteLinkEnabled,
        canStudentsSeeGroupProgress
      );
    } else {
      console.log(`Group '${groupName}' was not found in course '${courseId}'`);
    }
  }
}

async function copyGroupAsync(
  existingGroup: Group,
  destinationCourseId: string,
  renameGroup: (from: string) => string,
  makeMeOwner: boolean,
  scoringGroups: ulearnApi.ScoringGroup[],
  reviewMode: ReviewMode,
  isInviteLinkEnabled: boolean,
  canStudentsSeeGroupProgress: boolean
): Promise<Group | null> {
  try {
    const groupInfo = await ulearnApi.copyGroupAsync(
      existingGroup.id,
      destinationCourseId,
      makeMeOwner
    );
    if (!groupInfo) {
      return null;
    }
    console.log(
      `Group '${existingGroup.name}' was copied to '${destinationCourseId}' with id=${groupInfo.id}`
    );

    const patch: GroupPatch = {
      isInviteLinkEnabled,
      isManualCheckingEnabled: reviewMode !== 'no',
      isManualCheckingEnabledForOldSolutions:
        reviewMode === 'perfect' || reviewMode === 'all',
      defaultProhibitFurtherReview:
        reviewMode !== 'continuous' && reviewMode !== 'all',
      canStudentsSeeGroupProgress,
    };
    let newGroupName = existingGroup.name;
    if (renameGroup) {
      newGroupName = renameGroup(existingGroup.name);
      patch.name = newGroupName;
    }
    const group = await ulearnApi.patchGroupAsync(groupInfo.id, patch);
    if (!group) {
      return null;
    }

    await ulearnApi.postGroupScoresAsync(group.id, scoringGroups);

    console.log(`    and was configured with name ${newGroupName}`);

    return group;
  } catch (e) {
    console.log(
      `An error occured while creating or configuring group '${existingGroup.name}'...`
    );
    return null;
  }
}

export type ReviewMode = 'no' | 'single' | 'continuous' | 'perfect' | 'all';
