import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { colors, radius, spacing, typography } from '../theme/theme';
import { describeDueDate, formatCurrency, formatDate } from '../utils/format';
import type { Loan } from '../types/api';

interface LoanCardProps {
  loan: Loan;
  onRepay?: (loan: Loan) => void;
  isRepaying?: boolean;
}

/**
 * A single loan row.
 *
 * Overdue loans are marked with a badge that carries both a glyph and a
 * wording ("Overdue by 3 days"), so the state never depends on colour alone.
 */
export function LoanCard({ loan, onRepay, isRepaying = false }: LoanCardProps): React.JSX.Element {
  const isRepaid = loan.status === 'repaid';

  return (
    <View
      style={[styles.card, loan.isOverdue && styles.cardOverdue]}
      accessibilityLabel={`${loan.friendName}, ${formatCurrency(loan.amount)}, ${
        isRepaid ? 'repaid' : describeDueDate(loan.dueDate)
      }`}
    >
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{loan.friendName.trim().charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {loan.friendName}
            </Text>
            <Text style={styles.meta}>Due {formatDate(loan.dueDate)}</Text>
          </View>
        </View>
        <Text style={styles.amount}>{formatCurrency(loan.amount)}</Text>
      </View>

      <View style={styles.badgeRow}>
        {loan.isOverdue ? (
          <Badge
            label={`Overdue by ${loan.daysOverdue} day${loan.daysOverdue === 1 ? '' : 's'}`}
            tone="danger"
            glyph="!"
          />
        ) : isRepaid ? (
          <Badge label="Repaid" tone="success" glyph="✓" />
        ) : (
          <Badge label={describeDueDate(loan.dueDate)} tone="warning" glyph="◷" />
        )}
        {loan.receiptPath ? <Badge label="Receipt attached" tone="primary" glyph="▣" /> : null}
      </View>

      {!isRepaid && onRepay ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark the loan to ${loan.friendName} as repaid`}
          disabled={isRepaying}
          onPress={() => onRepay(loan)}
          style={({ pressed }) => [styles.repayButton, pressed && styles.repayButtonPressed]}
        >
          <Text style={styles.repayLabel}>{isRepaying ? 'Updating…' : 'Mark as repaid'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardOverdue: {
    borderColor: colors.danger,
    borderLeftWidth: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  identityText: {
    flexShrink: 1,
  },
  name: {
    ...typography.subheading,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  amount: {
    ...typography.heading,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  repayButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repayButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  repayLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
