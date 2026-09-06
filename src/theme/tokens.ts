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
  accentInk: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
  waterSoft: string;
  waterInk: string;
  clay: string;
  seed: string;
  seedSoft: string;
  seedInk: string;
  good: string;
}

export interface ThemeFonts {
  serif: string;
  body: string;
  bodyBold: string;
  bodyHeavy: string;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
  shadow: { card: object; button: object };
}

// 4px base, unchanged from the original tokens.
const spacing = (n: number): number => n * 4;

// Softer than before: cards sit at xl (26), rows and pills at md/lg.
const radius = { sm: 14, md: 18, lg: 22, xl: 26, full: 999 };

const fonts: ThemeFonts = {
  serif: 'Newsreader_400Regular',
  body: 'NunitoSans_400Regular',
  bodyBold: 'NunitoSans_700Bold',
  bodyHeavy: 'NunitoSans_800ExtraBold',
};

const shadow = {
  card: {
    shadowColor: '#2B2723',
    shadowOpacity: 0.055,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  button: {
    shadowColor: '#7C9F86',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

export const themes: Record<ThemeName, Theme> = {
  // "Paper" — warm cream and sage. text3 is decorative only; body copy uses text2.
  light: {
    colors: {
      bg: '#FBF7F2',
      surface: '#FFFFFF',
      surface2: '#F4EFE7',
      text: '#2B2723',
      text2: '#6E6660',
      text3: '#8A827A',
      border: '#EAE3D8',
      track: '#F1EAE0',
      accent: '#7C9F86',
      accentSoft: '#E8F0E7',
      accentInk: '#4F6B57',
      protein: '#7C9F86',
      carbs: '#D2A05E',
      fat: '#A899C9',
      water: '#8FAFC4',
      waterSoft: '#EDF3F6',
      waterInk: '#43647A',
      clay: '#C58C6E',
      seed: '#E0A46A',
      seedSoft: '#FFF3E2',
      seedInk: '#8A5B22',
      good: '#7C9F86',
    },
    fonts,
    spacing,
    radius,
    shadow,
  },
  // "Dusk" — for evening use. The accent deliberately shifts from sage to amber.
  dark: {
    colors: {
      bg: '#1C1A19',
      surface: '#252220',
      surface2: '#2C2926',
      text: '#F5EFE6',
      text2: '#BDB3A6',
      text3: '#A79E93',
      border: '#332E2B',
      track: '#332E2B',
      accent: '#E0A46A',
      accentSoft: '#3A2F24',
      accentInk: '#D8B58C',
      protein: '#8FBE9C',
      carbs: '#E0A46A',
      fat: '#BFAEDD',
      water: '#7FA2B8',
      waterSoft: '#24302F',
      waterInk: '#A8C6D6',
      clay: '#D79C7C',
      seed: '#E0A46A',
      seedSoft: '#3A2F24',
      seedInk: '#E7C79C',
      good: '#8FBE9C',
    },
    fonts,
    spacing,
    radius,
    shadow: {
      card: { ...shadow.card, shadowColor: '#000000', shadowOpacity: 0.3 },
      button: { ...shadow.button, shadowColor: '#000000', shadowOpacity: 0.35 },
    },
  },
};

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}
