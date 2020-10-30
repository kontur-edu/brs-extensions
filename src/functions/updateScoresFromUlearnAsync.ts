import * as googleApi from '../apis/googleApi';
import { Spreadsheet } from '../apis/googleApi';
import * as ulearnApi from '../apis/ulearnApi';
import {
  Group,
  ScoringGroup,
  Statistics,
  StatisticsStudent,
} from '../apis/ulearnApi';
import * as fio from '../helpers/fio';

export default async function updateScoresFromUlearn(
  spreadsheetId: string,
  readRange: string,
  writeRange: string,
  updateTimeRange: string,
  courseId: string,
  groupNames: string[],
  onlyMaxScoresForHomework: boolean,
  authorizePolicy: googleApi.AuthorizePolicy = 'ask-if-not-saved'
) {
  const studentScores = await getStudentScoresAsync(
    courseId,
    groupNames,
    onlyMaxScoresForHomework
  );

  await googleApi.authorizeAsync(authorizePolicy);
  const sheet = googleApi.openSpreadsheet(spreadsheetId);

  const result = await fillSheetWithScoresAsync(
    sheet,
    readRange,
    writeRange,
    studentScores
  );
  sheet.writeAsync(updateTimeRange, [[new Date().toLocaleString()]]);
  return result;
}

async function fillSheetWithScoresAsync(
  sheet: Spreadsheet,
  readRange: string,
  writeRange: string,
  studentScores: StudentScores
) {
  const result = {
    found: 0,
    updated: 0,
    skipped: 0,
    appended: 0,
    total: 0,
  };

  const newRows = [];
  const oldRows = (await sheet.readAsync(readRange)).values || [];
  for (const oldRow of oldRows) {
    const id = oldRow[0];
    if (!studentScores[id]) {
      newRows.push(oldRow);
      result.skipped++;
    } else {
      const newRow = getRowByStudentScore(studentScores[id]);
      newRows.push(newRow);
      delete studentScores[id];

      let updated = false;
      for (let i = 0; i < newRow.length; i++) {
        if (!oldRow[i] || newRow[i].toString() !== oldRow[i].toString()) {
          updated = true;
          break;
        }
      }

      if (updated) {
        result.updated++;
      }
      result.found++;
    }
  }

  const restStudentScores = Object.keys(studentScores)
    .map(k => studentScores[k])
    .sort((a, b) => {
      const c1 = a.groupName.localeCompare(b.groupName);
      return c1 !== 0 ? c1 : a.name.localeCompare(b.name);
    });
  for (const s of restStudentScores) {
    newRows.push(getRowByStudentScore(s));
    result.appended++;
  }

  await sheet.writeAsync(writeRange, newRows);

  result.total = newRows.length;
  return result;
}

function getRowByStudentScore(studentScore: StudentScore) {
  return [
    studentScore.id,
    studentScore.groupName,
    fio.toKey(studentScore.name),
    studentScore.scores.exercise,
    studentScore.scores.homework,
  ];
}

async function getStudentScoresAsync(
  courseId: string,
  groupNames: string[],
  onlyMaxScoresForHomework: boolean
) {
  const availableGroups = await ulearnApi.getGroupsAsync(courseId);
  const filteredGroups = availableGroups.filter(g =>
    groupNames.some(n => g.name === n)
  );

  const filteredGroupIds = filteredGroups.map(g => g.id);
  const statistics = await ulearnApi.getCourseStatisticsAsync(
    courseId,
    filteredGroupIds
  );

  const slideScores = getSlideScores(statistics);
  const students = statistics.students.map(s =>
    getStudentScore(s, slideScores, filteredGroups, onlyMaxScoresForHomework)
  );

  const result: StudentScores = {};
  for (const s of students) {
    result[s.id] = s;
  }
  return result;
}

function getSlideScores(statistics: Statistics) {
  const result: SlideScores = {};
  for (const u of statistics.course.units) {
    for (const s of u.slides) {
      result[s.id] = {
        maxScore: s.max_score,
        scoringGroup: s.max_score <= 10 ? 'exercise' : 'homework',
      };
    }
  }
  return result;
}

function getStudentScore(
  student: StatisticsStudent,
  slideScores: SlideScores,
  groups: Group[],
  onlyMaxScoresForHomework: boolean
): StudentScore {
  const scores = {
    activity: 0,
    exercise: 0,
    homework: 0,
    seminar: 0,
  };

  for (const score of student.slides_scores) {
    const slideScore = slideScores[score.slide_id];
    if (
      !onlyMaxScoresForHomework ||
      slideScore.scoringGroup !== 'homework' ||
      score.score === slideScore.maxScore
    ) {
      scores[slideScore.scoringGroup] += score.score;
    }
  }

  for (const score of student.additional_scores) {
    scores[score.scoring_group_id] += score.score;
  }

  const mainGroup = groups.filter(group =>
    student.groups.some(groupId => group.id === groupId)
  )[0];

  return {
    id: student.user_id,
    name: student.name,
    groupId: mainGroup.id,
    groupName: mainGroup.name,
    scores,
  };
}

interface StudentScores {
  [id: string]: StudentScore;
}

interface StudentScore {
  id: string;
  name: string;
  groupId: number;
  groupName: string;
  scores: { [key in ScoringGroup]: number };
}

interface SlideScores {
  [id: string]: SlideScore;
}

interface SlideScore {
  maxScore: number;
  scoringGroup: ScoringGroup;
}
