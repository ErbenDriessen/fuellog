import { themes, getTheme } from './tokens';

describe('theme tokens', () => {
  it('exposes light and dark with identical color keys', () => {
    const lightKeys = Object.keys(themes.light.colors).sort();
    const darkKeys = Object.keys(themes.dark.colors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('includes the macro and surface tokens the food UI needs', () => {
    for (const key of ['protein', 'carbs', 'fat', 'surface2', 'text2', 'text3', 'track', 'accentSoft']) {
      expect(themes.light.colors).toHaveProperty(key);
      expect(themes.dark.colors).toHaveProperty(key);
    }
  });

  it('spacing scales by a 4px base', () => {
    expect(getTheme('light').spacing(3)).toBe(12);
  });

  it('exposes the full radius scale', () => {
    expect(getTheme('dark').radius).toEqual({ sm: 14, md: 18, lg: 22, xl: 26, full: 999 });
  });

  it('every color is a hex string', () => {
    for (const theme of [getTheme('light'), getTheme('dark')]) {
      for (const c of Object.values(theme.colors)) {
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('exposes the font family map both themes share', () => {
    for (const theme of [getTheme('light'), getTheme('dark')]) {
      expect(theme.fonts).toEqual({
        serif: 'Newsreader_400Regular',
        body: 'NunitoSans_400Regular',
        bodyBold: 'NunitoSans_700Bold',
        bodyHeavy: 'NunitoSans_800ExtraBold',
      });
    }
  });

  it('exposes card and button shadow presets', () => {
    for (const theme of [getTheme('light'), getTheme('dark')]) {
      expect(theme.shadow.card).toBeDefined();
      expect(theme.shadow.button).toBeDefined();
    }
  });
});
