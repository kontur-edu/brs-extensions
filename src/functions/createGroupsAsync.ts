import * as ulearnApi from '../apis/ulearnApi';
import { Group } from '../apis/ulearnApi';

export default async function createGroupsAsync(
  courseId: string,
  groupNames: string[],
  scoringGroups: ulearnApi.ScoringGroup[],
  reviewMode: ReviewMode = 'perfect',
  isInviteLinkEnabled: boolean = false,
  canStudentsSeeGroupProgress: boolean = true
) {
  const existingGroups = await ulearnApi.getGroupsAsync(courseId);
  for (const groupName of groupNames) {
    if (existingGroups.some(g => g.name === groupName)) {
      console.log(`Group '${groupName}' already exists`);
      continue;
    }
    await createGroupAsync(
      courseId,
      groupName,
      scoringGroups,
      reviewMode,
      isInviteLinkEnabled,
      canStudentsSeeGroupProgress
    );
  }
}

async function createGroupAsync(
  courseId: string,
  groupName: string,
  scoringGroups: ulearnApi.ScoringGroup[],
  reviewMode: ReviewMode,
  isInviteLinkEnabled: boolean,
  canStudentsSeeGroupProgress: boolean
): Promise<Group | null> {
  try {
    const groupInfo = await ulearnApi.postGroupAsync(courseId, groupName);
    if (!groupInfo) {
      return null;
    }
    console.log(`Group '${groupName}' was created with id=${groupInfo.id}`);

    const patch = {
      isInviteLinkEnabled,
      isManualCheckingEnabled: reviewMode !== 'no',
      isManualCheckingEnabledForOldSolutions:
        reviewMode === 'perfect' || reviewMode === 'all',
      defaultProhibitFurtherReview:
        reviewMode !== 'continuous' && reviewMode !== 'all',
      canStudentsSeeGroupProgress,
    };
    const group = await ulearnApi.patchGroupAsync(groupInfo.id, patch);
    if (!group) {
      return null;
    }

    await ulearnApi.postGroupScoresAsync(group.id, scoringGroups);

    console.log(`    and was configured`);

    return group;
  } catch (e) {
    console.log(
      `An error occured while creating or configuring group '${groupName}'...`
    );
    return null;
  }
}

export type ReviewMode = 'no' | 'single' | 'continuous' | 'perfect' | 'all';
