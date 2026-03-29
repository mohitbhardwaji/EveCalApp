export const StorageKeys = {
  authed: 'eveCal.authed',
  /** `guest` | `supabase` — how the user entered the app (guest vs OAuth). */
  authMode: 'eveCal.authMode',
  premiumSeen: 'eveCal.premiumSeen',
  /** JSON: Record<slotKey, moodLabel> — slotKey = YYYY-MM-DD_morning|afternoon|night */
  journalMoodCheckins: 'eveCal.journalMoodCheckins',
  /** JSON: JournalEntry[] — free-form journal reflections */
  journalEntries: 'eveCal.journalEntries',
  settingsNotifications: 'eveCal.settings.notifications',
} as const;

