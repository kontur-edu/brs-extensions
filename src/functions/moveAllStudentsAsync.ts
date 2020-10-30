import * as ulearnApi from '../apis/ulearnApi';
import { Group } from '../apis/ulearnApi';
import { findGroupByName } from '../helpers/ulearnTools';
import { ActualStudent } from './readStudentsAsync';
import moveStudentAsync, { MoveStudentOptions } from './moveStudentAsync';

export default async function moveAllStudentsAsync(
  courseId: string,
  actualStudents: ActualStudent[],
  additionalSourceGroupInfos: { courseId: string; groupName: string }[],
  options: MoveStudentOptions
) {
  const courseGroups = await ulearnApi.getGroupsAsync(courseId);
  const targetGroups = findTargetGroups(courseGroups, actualStudents);
  const additionalSourceGroups = await findAdditionalGroupsAsync(
    courseId,
    courseGroups,
    additionalSourceGroupInfos
  );
  const sourceGroups = mergeGroups(targetGroups, additionalSourceGroups);

  for (const sourceGroup of sourceGroups) {
    await moveStudentsFrom(sourceGroup, targetGroups, actualStudents, options);
  }
}

async function moveStudentsFrom(
  sourceGroup: ulearnApi.Group,
  targetGroups: ulearnApi.Group[],
  actualStudents: ActualStudent[],
  options: MoveStudentOptions
) {
  const students = await ulearnApi.getStudentsAsync(sourceGroup.id);
  for (const student of students) {
    await moveStudentAsync(
      student,
      sourceGroup,
      targetGroups,
      actualStudents,
      options
    );
  }
}

function findTargetGroups(
  courseGroups: Group[],
  actualStudents: ActualStudent[]
) {
  const actualGroups: { [groupName: string]: boolean } = {};
  for (const student of actualStudents) {
    actualGroups[student.groupName] = true;
  }
  return Object.keys(actualGroups).map(groupName =>
    findGroupByName(courseGroups, groupName)
  );
}

async function findAdditionalGroupsAsync(
  courseId: string,
  courseGroups: Group[],
  additionalGroups: { courseId: string; groupName: string }[]
): Promise<Group[]> {
  let result: Group[] = [];
  for (const additionalGroup of additionalGroups) {
    const groups =
      additionalGroup.courseId === courseId
        ? courseGroups
        : await ulearnApi.getGroupsAsync(additionalGroup.courseId);
    result = result.concat(
      groups.filter(g => g.name === additionalGroup.groupName)
    );
  }
  return result;
}

function mergeGroups(groups1: Group[], groups2: Group[]): Group[] {
  const groups: { [id: string]: Group } = {};
  for (const g of groups1) {
    groups[g.id] = g;
  }
  for (const g of groups2) {
    groups[g.id] = g;
  }
  return Object.keys(groups).map(id => groups[id]);
}
