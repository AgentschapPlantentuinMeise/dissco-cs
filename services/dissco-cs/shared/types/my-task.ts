import { MadocInternationalString } from './common.js';

export type MyTaskProjectDto = {
  id: number;
  slug: string;
  label?: MadocInternationalString | string;
};

// One of the user's own tasks, as their dashboard shows it: only the fields it uses from Madoc's
// task (MadocCrowdsourcingTaskDto). Madoc's full task weighs about 1 kB, mostly the object's label
// and thumbnail URL, which the dashboard never shows; a volunteer can have thousands of tasks.
export type MyTaskDto = {
  id: string;
  name: string;
  // Madoc's task status, e.g. 1 saved, 2 submitted, 3 accepted, -1 abandoned.
  status: number;
  // The object the task is about, e.g. 'urn:madoc:manifest:12'.
  subject: string | null;
  // The manifest above the subject when the subject is a canvas, e.g. 'urn:madoc:manifest:12'.
  subjectParent: string | null;
  // The project's root task: one object can have a task in several projects.
  rootTask: string | null;
  // Milliseconds since 1970.
  modifiedAt: number | null;
  // The project Madoc traced the task to, or null when it could not.
  project: MyTaskProjectDto | null;
};
