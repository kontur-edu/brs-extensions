import * as ulearnApi from '../apis/ulearnApi';
import { Group, Student } from '../apis/ulearnApi';
import * as fio from '../helpers/fio';
import {
  findGroupByName,
  getFullName,
  isGroupContainsStudentAsync,
} from '../helpers/ulearnTools';
import { ActualStudent } from './readStudentsAsync';

export default async function moveStudentAsync(
  student: Student,
  sourceGroup: Group,
  targetGroups: Group[],
  actualStudents: ActualStudent[],
  options: MoveStudentOptions
) {
  const verbosity = options.verbosity || 'all';

  const fullName = getFullName(student);

  const suitableActualStudents = findSuitableActualStudents(
    actualStudents,
    student
  );
  if (suitableActualStudents.length !== 1) {
    if (verbosity === 'all' || verbosity === 'tries-and-moves')
      console.log(
        `>>> '${fullName}' from '${sourceGroup.name}' was skipped,` +
          ` because was founded ${suitableActualStudents.length} times` +
          ` in the actual list`
      );
    return;
  }
  const actualStudent = suitableActualStudents[0];

  const targetGroup = findGroupByName(targetGroups, actualStudent.groupName);

  if (targetGroup.id === sourceGroup.id) {
    if (verbosity === 'all')
      console.log(
        `>>> '${fullName}' from '${sourceGroup.name}' was skipped,` +
          ` because source and target groups match ('${targetGroup.name}')`
      );
    return;
  }

  console.log(`>>> '${fullName}' processing...`);
  if (await isGroupContainsStudentAsync(targetGroup, student)) {
    console.log(
      ` 1) '${fullName}' had been already exist at '${targetGroup.name}'`
    );
  } else {
    await ulearnApi.copyStudentsToGroup([student.id], targetGroup.id);
    console.log(
      ` 1) '${fullName}' was copied from '${sourceGroup.name}'` +
        ` to '${targetGroup.name}'`
    );
  }
  if (await isGroupContainsStudentAsync(targetGroup, student)) {
    await ulearnApi.deleteStudentAsync(sourceGroup.id, student.id);
    console.log(` 2) '${fullName}' was removed from '${sourceGroup.name}'`);
  } else {
    console.log(
      ` 2) '${fullName}' was not removed` +
        ` from '${sourceGroup.name}',` +
        ` because not found at '${targetGroup.name}'`
    );
  }
}

export function findSuitableActualStudents(
  actualStudents: ActualStudent[],
  student: Student
): ActualStudent[] {
  const fullName = getFullName(student);

  const firstResult = actualStudents.filter(
    s => fio.toKey(s.fullName) === fio.toKey(fullName)
  );
  if (firstResult.length === 1) return firstResult;

  const secondResult = actualStudents.filter(s => s.id && student.id === s.id);
  if (secondResult.length === 1) return secondResult;

  return firstResult;
}

export interface MoveStudentOptions {
  verbosity: 'all' | 'tries-and-moves' | 'just-moves';
}
