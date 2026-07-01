export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  text2: string;
  text3: string;
  border: string;
  track: string;
  accent: string;
  accentSoft: string;
  protein: string;
  carbs: string;
  fat: string;
  good: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
}

// 4px spacing base (prototype --s1..--s8 = 4,8,12,16,20,24,32).
const spacing = (n: number): number => n * 4;

// prototype --r-sm/md/lg/xl/full.
const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 };

// Colors converted from the prototype's OKLCH values to sRGB hex.
export const themes: Record<ThemeName, Theme> = {
  light: {
    colors: {
      bg: '#fafaf9',
      surface: '#ffffff',
      surface2: '#f2f2ef',
      text: '#211f1c',
      text2: '#666260',
      text3: '#95918f',
      border: '#e4e3e1',
      track: '#e6e4e2',
      accent: '#d9515e',
      accentSoft: '#ffe6e5',
      protein: '#3eaf86',
      carbs: '#d7a03d',
      fat: '#7973ca',
      good: '#4fa866',
    },
    spacing,
    radius,
  },
  dark: {
    colors: {
      bg: '#0e1112',
      surface: '#161a1b',
      surface2: '#1e2323',
      text: '#f0f2f3',
      text2: '#9a9fa0',
      text3: '#6d7374',
      border: '#2a2f30',
      track: '#2c3132',
      accent: '#f16f78',
      accentSoft: '#4d2527',
      protein: '#5fc199',
      carbs: '#e8b45e',
      fat: '#9793e6',
      good: '#69ba7c',
    },
    spacing,
    radius,
  },
};

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}
