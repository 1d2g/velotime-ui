// src/mockData.js
// This acts as our temporary database protocol until the Express API is ready.
export const ALL_POSSIBLE_TASKS = [
  { id: 't_dev', name: 'Development' },
  { id: 't_design', name: 'Design' },
  { id: 't_test', name: 'Testing' },
  { id: 't_meet', name: 'Meetings' },
  { id: 't_doc', name: 'Documentation' },
  { id: 't_review', name: 'Code Review' },
  { id: 't_plan', name: 'Planning' },
  { id: 't_admin', name: 'Administration' },
  { id: 't_support', name: 'Client Support' }
];

export const initialDates = [
  {
    "id": "2026-05-01",
    "label": "Friday",
    "dateStr": "5/1/2026"
  },
  {
    "id": "2026-05-04",
    "label": "Monday",
    "dateStr": "5/4/2026"
  },
  {
    "id": "2026-05-05",
    "label": "Tuesday",
    "dateStr": "5/5/2026"
  },
  {
    "id": "2026-05-06",
    "label": "Wednesday",
    "dateStr": "5/6/2026"
  },
  {
    "id": "2026-05-07",
    "label": "Thursday",
    "dateStr": "5/7/2026"
  },
  {
    "id": "2026-05-08",
    "label": "Friday",
    "dateStr": "5/8/2026"
  },
  {
    "id": "2026-05-11",
    "label": "Monday",
    "dateStr": "5/11/2026"
  }
];

export const initialProjects = [
  {
    "id": "p1",
    "name": "Headquarters Redesign",
    "tasks": [
      {
        "id": "t1",
        "name": "Schematic Design"
      },
      {
        "id": "t2",
        "name": "Site Visit"
      },
      {
        "id": "t3",
        "name": "Drafting"
      }
    ]
  },
  {
    "id": "p2",
    "name": "Server Migration",
    "tasks": [
      {
        "id": "t4",
        "name": "Database Backup"
      },
      {
        "id": "t5",
        "name": "Load Testing"
      }
    ]
  },
  {
    "id": "p3",
    "name": "Q3 Marketing Campaign",
    "tasks": [
      {
        "id": "t6",
        "name": "Copywriting"
      },
      {
        "id": "t7",
        "name": "Asset Design"
      },
      {
        "id": "t8",
        "name": "Ad Buying"
      }
    ]
  },
  {
    "id": "p4",
    "name": "Internal Audit",
    "tasks": [
      {
        "id": "t9",
        "name": "Financial Review"
      }
    ]
  }
];

export const initialEntries = {
  "2026-05-01_t7": 0.5,
  "2026-05-01_t9": 2.5,
  "2026-05-04_t1": 1.0,
  "2026-05-04_t6": 3.0,
  "2026-05-04_t7": 8.0,
  "2026-05-04_t9": 0.5,
  "2026-05-05_t7": 4.0,
  "2026-05-06_t4": 0.5,
  "2026-05-06_t5": 4.0,
  "2026-05-06_t7": 2.0,
  "2026-05-07_t3": 0.5,
  "2026-05-07_t5": 2.5,
  "2026-05-07_t7": 4.5,
  "2026-05-08_t2": 2.0,
  "2026-05-08_t3": 2.0,
  "2026-05-08_t4": 4.0,
  "2026-05-08_t7": 8.0,
  "2026-05-08_t8": 1.5,
  "2026-05-11_t2": 4.5,
  "2026-05-11_t3": 8.0,
  "2026-05-11_t5": 0.5,
  "2026-05-11_t9": 0.5
};