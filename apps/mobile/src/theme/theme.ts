/**
 * MiniLedger design tokens.
 *
 * A small, deliberate palette with strong contrast (WCAG AA on the surfaces
 * used here) plus spacing, radius and typography scales so every screen
 * looks like it belongs to the same product.
 */

export const colors = {
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',

  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primarySoft: '#EEF2FF',

  success: '#047857',
  successSoft: '#ECFDF5',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',

  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#94A3B8',
  onPrimary: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  disabled: '#E2E8F0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  subheading: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  mono: { fontSize: 24, fontWeight: '700' as const, letterSpacing: 10 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Minimum touch target recommended by the platform accessibility guidelines. */
export const TOUCH_TARGET = 48;
