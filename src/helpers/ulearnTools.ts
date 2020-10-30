import { Group, Student, getStudentsAsync } from '../apis/ulearnApi';

export function findGroupByName(
  ulearnGroups: Group[],
  groupName: string
): Group {
  const suitableGroups = ulearnGroups.filter(g => g.name === groupName);
  if (suitableGroups.length !== 1) {
    throw new Error(`Can't find single group '${groupName}' at ulearn`);
  }
  return suitableGroups[0];
}

export function getFullName(student: Student) {
  const { lastName, firstName, visibleName } = student;
  return lastName || firstName
    ? `${lastName.trim()} ${firstName.trim()}`
    : visibleName;
}

export async function isGroupContainsStudentAsync(
  group: Group,
  student: Student
) {
  if (student.id) {
    const students = await getStudentsAsync(group.id);
    return students.some(s => s.id === student.id);
  }
  return false;
}
