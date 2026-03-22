import type { Theme as NavigationTheme } from '@react-navigation/native';

export const EveCalTheme = {
  colors: {
    bg: '#F6F1EA',
    card: '#FFFFFF',
    cardWarm: '#FBF7F1',
    border: 'rgba(58,45,42,0.10)',
    shadow: 'rgba(0,0,0,0.08)',
    text: '#3A2D2A',
    textMuted: 'rgba(58,45,42,0.55)',
    tabInactive: 'rgba(58,45,42,0.45)',
    tabActive: '#3A2D2A',
    accent1: '#2F8D77',
    accent2: '#4B7AA6',
    premiumBrown: '#8E776E',
    softGreen: '#A8C9BE',
    softBlue: '#A8B7C9',
    softRose: '#C9A8B7',
    softSand: '#C9BBA8',
  },
  radius: {
    lg: 24,
    md: 18,
    sm: 14,
  },
  typography: {
    serif: 'Times New Roman',
    system: undefined as unknown as string,
  },
  navigationTheme: {
    dark: false,
    colors: {
      primary: '#3A2D2A',
      background: '#F6F1EA',
      card: '#FFFFFF',
      text: '#3A2D2A',
      border: 'rgba(58,45,42,0.10)',
      notification: '#2F8D77',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  } satisfies NavigationTheme,
};

