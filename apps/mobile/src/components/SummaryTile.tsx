import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';

interface SummaryTileProps {
  label: string;
  amount: string;
  caption?: string;
  tone?: 'primary' | 'success' | 'danger';
  /** Leading glyph - the tone is never the only carrier of meaning. */
  glyph: string;
  onPress?: () => void;
}

export function SummaryTile({
  label,
  amount,
  caption,
  tone = 'primary',
  glyph,
  onPress,
}: SummaryTileProps): React.JSX.Element {
  const Wrapper = onPress ? View : View;
  return (
    <Wrapper style={[styles.tile, toneStyles[tone].tile]}>
      <View style={[styles.glyphCircle, toneStyles[tone].circle]}>
        <Text style={[styles.glyph, toneStyles[tone].label]}>{glyph}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, toneStyles[tone].amount]} numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  glyphCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  glyph: {
    ...typography.bodyStrong,
    fontWeight: '800',
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  amount: {
    ...typography.title,
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
});

const toneStyles = {
  primary: {
    tile: {},
    circle: { backgroundColor: colors.primarySoft },
    label: { color: colors.primaryDark },
    amount: { color: colors.text },
  },
  success: {
    tile: {},
    circle: { backgroundColor: colors.successSoft },
    label: { color: colors.success },
    amount: { color: colors.text },
  },
  danger: {
    tile: { borderColor: colors.danger, borderWidth: 1.5 },
    circle: { backgroundColor: colors.dangerSoft },
    label: { color: colors.danger },
    amount: { color: colors.danger },
  },
} as const;
