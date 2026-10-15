/**
 * Hand-written, fictional help-desk tickets for a made-up project-management
 * app. Several groups describe the same problem in different vocabulary
 * (e.g. "notifications", "alerts", "pings"), which is exactly where keyword
 * search struggles and embeddings shine.
 */
export interface Doc {
  id: string
  title: string
  body: string
  area: string
  mine?: boolean
}

export const docText = (d: Pick<Doc, 'title' | 'body'>) => `${d.title}. ${d.body}`

export const SAMPLE_DOCS: Doc[] = [
  // Missing notifications, three vocabularies
  { id: 'HD-101', area: 'Notifications', title: 'Not getting alerts when someone mentions me', body: 'Teammates tag me in comments but no notification ever shows up on desktop or mobile.' },
  { id: 'HD-102', area: 'Notifications', title: 'Pings stopped arriving after the last update', body: 'Since Tuesday I no longer hear anything when a task is assigned to me.' },
  { id: 'HD-103', area: 'Notifications', title: 'Email digests never land in my inbox', body: 'The daily summary is enabled in settings, but nothing has arrived for a week. Not in spam either.' },

  // Work vanishing
  { id: 'HD-104', area: 'Data', title: 'Comment I typed was gone after switching tabs', body: 'Wrote a long reply on a task, clicked over to another project, came back and the text box was empty.' },
  { id: 'HD-105', area: 'Data', title: 'Task description reverted to an older version', body: 'I edited the description and saw it saved, but the next morning the old wording was back.' },
  { id: 'HD-106', area: 'Data', title: 'Board columns reset after reload', body: 'I renamed and reordered columns, refreshed the page, and they returned to the default layout.' },

  // Slowness
  { id: 'HD-107', area: 'Performance', title: 'Timeline view takes forever to open', body: 'Projects with a few hundred tasks need 20+ seconds before the Gantt chart is usable.' },
  { id: 'HD-108', area: 'Performance', title: 'Typing lags in large documents', body: 'Every keystroke appears half a second late once a doc gets past a few pages.' },
  { id: 'HD-109', area: 'Performance', title: 'Laptop fan spins up whenever the app is open', body: 'The browser tab uses a lot of CPU even when I am not touching anything.' },

  // Sign-in
  { id: 'HD-110', area: 'Access', title: 'Kicked back to the login screen every hour', body: 'My session keeps expiring mid-task and I have to enter my password again.' },
  { id: 'HD-111', area: 'Access', title: 'Two-factor code always rejected', body: 'The six-digit code from my authenticator app is never accepted, even right after it refreshes.' },
  { id: 'HD-112', area: 'Access', title: 'SSO redirect loops endlessly', body: 'Clicking "Sign in with company account" bounces between two pages and never lets me in.' },

  // Billing
  { id: 'HD-113', area: 'Billing', title: 'Charged twice for the same month', body: 'My card statement shows two identical subscription payments on the 3rd.' },
  { id: 'HD-114', area: 'Billing', title: 'Invoice is missing our VAT number', body: 'Finance cannot process the PDF invoice because the tax ID field is blank.' },
  { id: 'HD-115', area: 'Billing', title: 'Downgrade did not lower the price', body: 'Switched from Business to Team plan but the renewal quote is still the old amount.' },

  // Files
  { id: 'HD-116', area: 'Files', title: 'Attachments over 10 MB fail silently', body: 'Upload bar reaches 100% and then the file simply is not attached to the task.' },
  { id: 'HD-117', area: 'Files', title: 'Image previews show a broken icon', body: 'Pictures attached to tasks display as a grey square; downloading them works fine.' },

  // Integrations / export
  { id: 'HD-118', area: 'Integrations', title: 'Calendar sync duplicates every due date', body: 'Each task deadline appears two or three times in my Google Calendar.' },
  { id: 'HD-119', area: 'Integrations', title: 'Slack bot posts to the wrong channel', body: 'Updates for the Design project show up in #marketing instead of #design.' },
  { id: 'HD-120', area: 'Export', title: 'Spreadsheet export drops custom fields', body: 'The CSV contains standard columns only; our Priority Score and Client fields are missing.' },

  // Wishes and distractors
  { id: 'HD-121', area: 'Requests', title: 'Please add a dark theme', body: 'Working late with a bright white interface is hard on the eyes.' },
  { id: 'HD-122', area: 'Requests', title: 'Allow recurring tasks on weekdays only', body: 'I need a task that repeats Monday to Friday but skips weekends.' },
  { id: 'HD-123', area: 'Mobile', title: 'Android app crashes when opening a project', body: 'The app closes immediately after tapping any project from the home screen.' },
  { id: 'HD-124', area: 'Mobile', title: 'Can’t scroll the task list on iPad', body: 'Swiping on the list in landscape mode does nothing; portrait works.' },
]

export const EXAMPLE_QUERIES = [
  'my edits disappear',
  "I'm not being notified",
  'app is really sluggish',
  'billed incorrectly',
  'cannot log in',
  'photos won’t display',
]
