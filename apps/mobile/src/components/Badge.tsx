import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Leading glyph, used so the state is not communicated by colour alone. */
  glyph?: string;
  style?: object;
}

export function Badge({ label, tone = 'neutral', glyph, style }: BadgeProps): React.JSX.Element {
  return (
    <View style={[styles.badge, toneStyles[tone].container, style]}>
      {glyph ? <Text style={[styles.glyph, toneStyles[tone].label]}>{glyph}</Text> : null}
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
  glyph: {
    ...typography.caption,
    fontWeight: '700',
  },
});

const toneStyles: Record<Tone, { container: { backgroundColor: string }; label: { color: string } }> =
  {
    primary: {
      container: { backgroundColor: colors.primarySoft },
      label: { color: colors.primaryDark },
    },
    success: {
      container: { backgroundColor: colors.successSoft },
      label: { color: colors.success },
    },
    danger: {
      container: { backgroundColor: colors.dangerSoft },
      label: { color: colors.danger },
    },
    warning: {
      container: { backgroundColor: colors.warningSoft },
      label: { color: colors.warning },
    },
    neutral: {
      container: { backgroundColor: colors.surfaceMuted },
      label: { color: colors.textMuted },
    },
  };
