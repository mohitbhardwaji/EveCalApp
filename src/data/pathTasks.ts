/**
 * Mock Path tasks + detail payloads for Task List → Task Detail flow.
 */

export type TaskListItem = {
  id: string;
  title: string;
  meta: string;
  align: 'left' | 'right';
  icon: string;
  tint: string;
};

export type TaskDetailPayload = {
  room: string;
  description: string;
  whenLabel: string;
  repeatLabel: string;
  tagLabel: string;
  notes: string;
};

const TASKS_BY_CATEGORY: Record<string, TaskListItem[]> = {
  'social-harmony': [
    {
      id: '1',
      title: 'Book club dinner planning',
      meta: 'Next Thursday • 7:00 PM',
      align: 'left',
      icon: 'users',
      tint: '#7DAFFF',
    },
    {
      id: '2',
      title: "Sarah's birthday gift",
      meta: 'This weekend • Saturday',
      align: 'right',
      icon: 'coffee',
      tint: '#C9A882',
    },
    {
      id: '3',
      title: 'Family video call',
      meta: 'Weekly check-in • Sunday 5pm',
      align: 'left',
      icon: 'leaf',
      tint: '#9BC4A8',
    },
  ],
  'daily-rituals': [
    {
      id: '1',
      title: 'Morning meditation',
      meta: 'Daily • 7:00 AM',
      align: 'right',
      icon: 'sun',
      tint: '#E6C9A8',
    },
    {
      id: '2',
      title: 'Evening walk',
      meta: 'Today • 8:30 PM',
      align: 'left',
      icon: 'moon',
      tint: '#A8B7C9',
    },
  ],
  'core-peace': [
    {
      id: '1',
      title: 'Quiet reading hour',
      meta: 'Saturday • 4:00 PM',
      align: 'left',
      icon: 'book-open',
      tint: '#A8D5BA',
    },
  ],
  'home-base': [
    {
      id: '1',
      title: 'Pantry organization',
      meta: 'Flexible',
      align: 'right',
      icon: 'package',
      tint: '#C9A882',
    },
    {
      id: '2',
      title: 'Plant watering schedule',
      meta: 'Weekly',
      align: 'left',
      icon: 'droplet',
      tint: '#9BC4A8',
    },
  ],
  growth: [
    {
      id: '1',
      title: 'Journal reflection',
      meta: 'Tonight',
      align: 'left',
      icon: 'heart',
      tint: '#E8A0A0',
    },
  ],
};

/** Optional rich copy per category + task id */
const TASK_DETAILS: Record<string, Record<string, TaskDetailPayload>> = {
  'social-harmony': {
    '1': {
      room: 'Dining room',
      description:
        'Pick a date that works for the group, choose a book for next month, and send a calendar invite with the restaurant address. Confirm dietary restrictions before you reserve.',
      whenLabel: 'Next Thursday, 7:00 PM',
      repeatLabel: 'Monthly (4th Thursday)',
      tagLabel: 'Social',
      notes: 'Reserve for 6–8 people; ask about vegan options.',
    },
    '2': {
      room: 'Errands',
      description:
        'Shortlist two gift ideas, check her wish list, and pick up wrapping supplies. Aim to have it ready before Saturday brunch.',
      whenLabel: 'This Saturday, morning',
      repeatLabel: 'One-time',
      tagLabel: 'Gifts',
      notes: 'Receipt in email folder “Gifts”.',
    },
    '3': {
      room: 'Living room',
      description:
        'Test Wi‑Fi and camera angle five minutes early. Keep a glass of water nearby and silence notifications.',
      whenLabel: 'Sunday, 5:00 PM',
      repeatLabel: 'Weekly',
      tagLabel: 'Family',
      notes: '',
    },
  },
  'daily-rituals': {
    '1': {
      room: 'Bedroom',
      description:
        'Ten minutes on the cushion, eyes soft, focus on breath. Same spot each day builds the habit.',
      whenLabel: 'Daily, 7:00 AM',
      repeatLabel: 'Every day',
      tagLabel: 'Wellness',
      notes: 'Use the guided track if mornings feel noisy.',
    },
    '2': {
      room: 'Neighborhood',
      description:
        'Loop around the block or the park. Light stretch when you return.',
      whenLabel: 'Today, 8:30 PM',
      repeatLabel: 'Most evenings',
      tagLabel: 'Movement',
      notes: '',
    },
  },
  'core-peace': {
    '1': {
      room: 'Reading nook',
      description:
        'Phone in another room, one chapter or twenty pages — whichever comes first. Tea optional.',
      whenLabel: 'Saturday, 4:00 PM',
      repeatLabel: 'Weekly',
      tagLabel: 'Rest',
      notes: 'Current read on the side table.',
    },
  },
  'home-base': {
    '1': {
      room: 'Kitchen',
      description:
        'Group dry goods by type, check dates, and donate anything you won’t use. Wipe shelves before restocking.',
      whenLabel: 'Flexible this week',
      repeatLabel: 'Seasonal',
      tagLabel: 'Home',
      notes: 'Need extra bins? List in Notes app.',
    },
    '2': {
      room: 'Living Room',
      description:
        'Water all indoor plants in the living room, including the fiddle leaf fig and snake plant. Check soil moisture first.',
      whenLabel: 'Next Tuesday, 9:00 AM',
      repeatLabel: 'Every Tuesday',
      tagLabel: 'Home',
      notes: 'Remember to use filtered water for the fiddle leaf fig',
    },
  },
  growth: {
    '1': {
      room: 'Anywhere quiet',
      description:
        'Three prompts: what felt good, what was hard, one thing to try tomorrow. No editing — just write.',
      whenLabel: 'Tonight, before bed',
      repeatLabel: 'Most nights',
      tagLabel: 'Growth',
      notes: '',
    },
  },
};

export function getTasksForCategory(
  categoryId: string,
  fallbackTint: string,
): TaskListItem[] {
  const existing = TASKS_BY_CATEGORY[categoryId];
  if (existing?.length) return existing;
  return [
    {
      id: '1',
      title: 'Sample task',
      meta: 'Tap + to add more',
      align: 'left',
      icon: 'check-circle',
      tint: fallbackTint,
    },
  ];
}

export function getTaskDetail(
  categoryId: string,
  taskId: string,
  listItem: TaskListItem,
  categoryTitle: string,
): TaskDetailPayload {
  const specific = TASK_DETAILS[categoryId]?.[taskId];
  if (specific) return specific;

  const firstPart = listItem.meta.split('•')[0]?.trim() || listItem.meta;
  return {
    room: categoryTitle,
    description: `When you’re ready, break “${listItem.title}” into small steps and add them here.`,
    whenLabel: firstPart,
    repeatLabel: 'Flexible',
    tagLabel: categoryTitle,
    notes: '',
  };
}

export function findTaskListItem(
  categoryId: string,
  taskId: string,
  fallbackTint: string,
): TaskListItem | undefined {
  return getTasksForCategory(categoryId, fallbackTint).find(t => t.id === taskId);
}
