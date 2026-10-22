import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps): React.JSX.Element {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: {
    padding: spacing.lg,
  },
});

interface SectionTitleProps {
  title: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionTitle({ title, action, style }: SectionTitleProps): React.JSX.Element {
  return (
    <View style={[sectionStyles.sectionRow, style]}>
      <Text style={sectionStyles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
});
export { sectionStyles as sectionTitleStyles };
export { styles as cardStyles };
export const typographyTokens = typography;
