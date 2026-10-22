import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

type Tone = 'error' | 'success' | 'info';

interface BannerProps {
  message: string;
  tone?: Tone;
  onDismiss?: () => void;
}

/** Inline message used for validation errors and confirmations. */
export function Banner({ message, tone = 'error', onDismiss }: BannerProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, toneStyles[tone].container]}
    >
      <Text style={[styles.glyph, toneStyles[tone].glyph]}>{tone === 'success' ? '✓' : '!'}</Text>
      <Text style={[styles.message, toneStyles[tone].message]}>{message}</Text>
      {onDismiss ? (
        <Text
          accessibilityRole="button"
          onPress={onDismiss}
          style={[styles.dismiss, toneStyles[tone].message]}
        >
          Dismiss
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
  },
  glyph: {
    ...typography.bodyStrong,
    fontWeight: '800',
  },
  message: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  dismiss: {
    ...typography.caption,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

const toneStyles = {
  error: {
    container: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    glyph: { color: colors.danger },
    message: { color: colors.danger },
  },
  success: {
    container: { backgroundColor: colors.successSoft, borderColor: colors.success },
    glyph: { color: colors.success },
    message: { color: colors.success },
  },
  info: {
    container: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    glyph: { color: colors.primaryDark },
    message: { color: colors.primaryDark },
  },
} as const;
