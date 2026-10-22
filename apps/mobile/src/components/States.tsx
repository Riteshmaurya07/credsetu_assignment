import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  /** Optional short glyph rendered above the title. */
  glyph?: string;
}

export function EmptyState({ title, message, glyph = '—' }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.glyphCircle}>
        <Text style={styles.glyph}>{glyph}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.glyphCircle, styles.errorCircle]}>
        <Text style={[styles.glyph, styles.errorGlyph]}>!</Text>
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Text style={styles.retry} onPress={onRetry} accessibilityRole="button">
          Try again
        </Text>
      ) : null}
    </View>
  );
}

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps): React.JSX.Element {
  return (
    <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  glyphCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorCircle: {
    backgroundColor: colors.dangerSoft,
  },
  glyph: {
    ...typography.title,
    color: colors.primary,
  },
  errorGlyph: {
    color: colors.danger,
    fontWeight: '800',
  },
  title: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  retry: {
    ...typography.bodyStrong,
    color: colors.primary,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
