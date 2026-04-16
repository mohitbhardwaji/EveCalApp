/**
 * Shared palette + Feather icons for Path category cards and Task list rows
 * (cycles by index so lists stay visually varied but consistent app-wide).
 */

export const PATH_CARD_TINTS = [
  '#7DAFFF',
  '#E6C9A8',
  '#A8D5BA',
  '#F4A6A6',
  '#A8B7C9',
  '#D4B8E8',
] as const;

export const PATH_CARD_ICONS = [
  'users',
  'coffee',
  'sun',
  'home',
  'heart',
  'compass',
] as const;

export const PATH_CARD_KICKERS = [
  'SACRED SPACE',
  'SUSTENANCE',
  'SANCTUARY',
  'FOUNDATION',
  'EXPANSION',
  'HARMONY',
] as const;

export type PathCardIconName = (typeof PATH_CARD_ICONS)[number];

export function pathCardTintAt(index: number): string {
  return PATH_CARD_TINTS[index % PATH_CARD_TINTS.length];
}

export function pathCardIconAt(index: number): string {
  return PATH_CARD_ICONS[index % PATH_CARD_ICONS.length];
}

export function pathCardKickerAt(index: number): string {
  return PATH_CARD_KICKERS[index % PATH_CARD_KICKERS.length];
}
