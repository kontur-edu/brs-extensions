import 'bluebird';
import * as fs from 'fs';
import request from 'request-promise';

const token = fs.readFileSync('./secrets/ulearn.jwt', 'utf8');
const baseApiUrl = 'https://api.ulearn.me';

const authCookie = fs.readFileSync('./secrets/ulearn.auth', 'utf8');
const baseSiteUrl = 'https://ulearn.me';

export async function getCourseStatisticsAsync(
  courseId: string,
  groupIds: number[]
) {
  return requestSiteJsonAsync<Statistics>(
    `/Analytics/ExportCourseStatisticsAsJson?courseId=${courseId}${groupIds
      .map(id => `&group=${id}`)
      .join('')}`
  );
}

export async function getGroupAsync(groupId: number) {
  return requestApiJsonAsync<Group>(`/groups/${groupId}`);
}

export async function getGroupsAsync(courseId: string) {
  return (
    await requestApiJsonAsync<{ groups: Group[] }>(
      `/groups?course_id=${courseId}`
    )
  ).groups;
}

export async function postGroupAsync(courseId: string, groupName: string) {
  return requestApiAsync<GroupPosted>(`/groups?course_id=${courseId}`, {
    method: 'POST',
    body: {
      name: groupName,
    },
    json: true,
  });
}

export async function patchGroupAsync(groupId: number, patch: GroupPatch) {
  return requestApiAsync<Group>(`/groups/${groupId}`, {
    method: 'PATCH',
    body: patch,
    json: true,
  });
}

export async function deleteGroupAsync(groupId: number) {
  return requestApiAsync<any>(`/groups/${groupId}`, {
    method: 'DELETE',
  });
}

export async function copyGroupAsync(
  groupId: number,
  destinationCourseId: string,
  makeMeOwner: boolean
) {
  return requestApiAsync<GroupPosted>(
    `/groups/${groupId}/copy?destination_course_id=${destinationCourseId}&make_me_owner=${makeMeOwner}`,
    {
      method: 'POST',
      json: true,
    }
  );
}

export async function getGroupScoresAsync(groupId: number) {
  return requestApiJsonAsync<GroupScores>(`/groups/${groupId}/scores`);
}

export async function postGroupScoresAsync(
  groupId: number,
  scoringGroups: ScoringGroup[]
) {
  return requestApiAsync<any>(`/groups/${groupId}/scores`, {
    method: 'POST',
    body: {
      scores: scoringGroups,
    },
    json: true,
  });
}

export async function getStudentsAsync(groupId: number) {
  return (
    await requestApiJsonAsync<{ students: StudentToGet[] }>(
      `/groups/${groupId}/students`
    )
  ).students.map(s => s.user);
}

export async function postStudentAsync(groupId: number, studentId: string) {
  return requestApiAsync<any>(`/groups/${groupId}/students/${studentId}`, {
    method: 'POST',
  });
}

export async function deleteStudentAsync(groupId: number, studentId: string) {
  return requestApiAsync<any>(`/groups/${groupId}/students/${studentId}`, {
    method: 'DELETE',
  });
}

export async function copyStudentsToGroup(
  studentIds: string[],
  toGroupId: number
) {
  return requestApiAsync<any>(`/groups/${toGroupId}/students`, {
    method: 'POST',
    body: {
      studentIds,
    },
    json: true,
  });
}

async function requestSiteJsonAsync<T>(uri: string): Promise<T> {
  const response = await requestSiteAsync(uri);
  return JSON.parse(response || "");
}

async function requestSiteAsync(uri: string): Promise<string | null> {
  const response = await request({
    url: baseSiteUrl + uri,
    method: 'GET',
    resolveWithFullResponse: true,
    simple: false,
    headers: { cookie: `ulearn.auth=${authCookie}` },
  });
  const contentType = response.headers['content-type'];
  if (contentType !== undefined && contentType.startsWith('application/json')) {
    return response.body;
  } else {
    console.error(
      '>> Ulearn Site error. Perhaps, you should update "ulearn.auth" cookie'
    );
    return null;
  }
}

async function requestApiJsonAsync<T>(
  uri: string,
  options?: RequestOptions
): Promise<T> {
  const response = await requestApiAsync<string>(uri, options);
  return JSON.parse(response || "");
}

async function requestApiAsync<T>(
  uri: string,
  options?: RequestOptions
): Promise<T | null> {
  const response = await request({
    method: 'GET',
    ...options,
    url: baseApiUrl + uri,
    resolveWithFullResponse: true,
    simple: false,
    headers: { Authorization: 'Bearer ' + token },
  });
  const contentType = response.headers['content-type'];
  if (contentType !== undefined && contentType.startsWith('application/json')) {
    return response.body;
  } else {
    console.error(
      '>> Ulearn API error. Perhaps, you should update "ulearn.jwt" token'
    );
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: object;
  json?: boolean;
}

type Status = 'ok' | string;
type Gender = 'male' | 'female' | string;
type AccessType = 'fullAccess' | string;
type timeString = string;

export interface Group {
  id: number;
  createTime: timeString;
  name: string;
  isArchived: boolean;
  inviteHash: string;
  isInviteLinkEnabled: boolean;
  areYouStudent: boolean;
  isManualCheckingEnabled: boolean;
  isManualCheckingEnabledForOldSolutions: boolean;
  defaultProhibitFurtherReview: boolean;
  canStudentsSeeGroupProgress: boolean;
  studentsCount: number;
  owner: User;
  accesses: [
    {
      user: User;
      accessType: AccessType;
      grantedBy: User;
      grantTime: timeString;
    }
  ];
  apiUrl: string;
  status: Status;
}

export interface GroupPosted {
  id: number;
  apiUrl: string;
  status: Status;
}

export interface GroupPatch {
  name?: string;
  isArchived?: boolean;
  isInviteLinkEnabled?: boolean;
  isManualCheckingEnabled?: boolean;
  isManualCheckingEnabledForOldSolutions?: boolean;
  defaultProhibitFurtherReview?: boolean;
  canStudentsSeeGroupProgress?: boolean;
}

export interface GroupScores {
  scores: GroupScore[];
  status: Status;
}

export interface GroupScore {
  areAdditionalScoresEnabledForAllGroups: boolean;
  canInstructorSetAdditionalScoreInSomeUnit: boolean;
  areAdditionalScoresEnabledInThisGroup: boolean;
  id: ScoringGroup;
  name: string;
  abbreviation: string;
  description: string;
}

export interface User {
  id: string;
  login: string;
  email: string;
  firstName: string;
  lastName: string;
  visibleName: string;
  avatarUrl: string;
  gender: Gender;
}

export interface Student {
  id: string;
  lastName: string;
  firstName: string;
  visibleName: string;
}

interface StudentToGet {
  user: Student;
}

export interface Statistics {
  course: StatisticsCourse;
  groups: StatisticsGroup[];
  students: StatisticsStudent[];
}

export interface StatisticsCourse {
  scoring_groups: CourseScoringGroup[];
  title: string;
  units: CourseUnit[];
}

export interface CourseScoringGroup {
  abbreviation: string;
  id: ScoringGroup;
  name: string;
}

export type ScoringGroup = 'activity' | 'exercise' | 'homework' | 'seminar';

export interface CourseUnit {
  additional_scores: CourseAdditionalScore[];
  id: string;
  slides: CourseSlide[];
  title: string;
}

export interface CourseAdditionalScore {
  max_additional_score: number;
  scoring_group_id: string;
}

export interface CourseSlide {
  id: string;
  max_score: number;
  title: string;
}

export interface StatisticsGroup {
  Title: string;
  id: string;
}

export interface StatisticsStudent {
  additional_scores: StudentAdditionalScore[];
  groups: number[];
  name: string;
  slides_scores: StudentSlideScore[];
  user_id: string;
}

export interface StudentAdditionalScore {
  score: number;
  scoring_group_id: ScoringGroup;
  unit_id: string;
}

export interface StudentSlideScore {
  score: number;
  slide_id: string;
}
