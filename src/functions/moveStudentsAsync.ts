import * as ulearnApi from '../apis/ulearnApi';
import { Group } from '../apis/ulearnApi';
import { findGroupByName } from '../helpers/ulearnTools';
import { ActualStudent } from './readStudentsAsync';
import moveStudentAsync, { MoveStudentOptions } from './moveStudentAsync';

export default async function moveStudentsAsync(
  courseId: string,
  sourceGroupName: string,
  actualStudents: ActualStudent[],
  options: MoveStudentOptions
) {
  const ulearnGroups = await ulearnApi.getGroupsAsync(courseId);
  const targetGroups = findTargetGroups(ulearnGroups, actualStudents);
  const sourceGroup = findGroupByName(ulearnGroups, sourceGroupName);

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
  ulearnGroups: Group[],
  actualStudents: ActualStudent[]
) {
  const actualGroups: { [groupName: string]: boolean } = {};
  for (const student of actualStudents) {
    actualGroups[student.groupName] = true;
  }

  return Object.keys(actualGroups).map(groupName =>
    findGroupByName(ulearnGroups, groupName)
  );
}
