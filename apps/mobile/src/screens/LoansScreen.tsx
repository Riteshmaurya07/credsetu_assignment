import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Banner } from '../components/Banner';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { LoanCard } from '../components/LoanCard';
import { useLedger } from '../ledger/LedgerContext';
import { colors, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';
import type { Loan } from '../types/api';

export function LoansScreen(): React.JSX.Element {
  const { loans, summary, isLoading, isRefreshing, error, refresh, markRepaid } = useLedger();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

  const confirmRepay = useCallback(
    (loan: Loan) => {
      Alert.alert(
        'Mark as repaid?',
        `${formatCurrency(loan.amount)} lent to ${loan.friendName} will be marked as repaid.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark as repaid',
            style: 'default',
            onPress: () => {
              void (async () => {
                setPendingId(loan.id);
                setActionError(null);
                setNotice(null);
                try {
                  await markRepaid(loan.id);
                  setNotice(`${loan.friendName}'s loan of ${formatCurrency(loan.amount)} is repaid.`);
                } catch (caught) {
                  setActionError(
                    caught instanceof Error
                      ? caught.message
                      : 'The loan could not be updated. Please try again.',
                  );
                } finally {
                  setPendingId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [markRepaid],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.count}>
            {loans.length} loan{loans.length === 1 ? '' : 's'}
          </Text>
          <Text style={styles.subtitle}>
            {summary
              ? `${formatCurrency(summary.totalLent)} lent · ${formatCurrency(summary.overdueAmount)} overdue`
              : ' '}
          </Text>
        </View>
      </View>
      {notice ? <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} /> : null}
      {actionError ? (
        <Banner message={actionError} onDismiss={() => setActionError(null)} />
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
    </View>
  );

  if (isLoading && loans.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading your loans…" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={loans}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh({ silent: true })}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={({ item }) => (
        <LoanCard loan={item} onRepay={confirmRepay} isRepaying={pendingId === item.id} />
      )}
      ListEmptyComponent={
        !error ? (
          <View style={styles.empty}>
            <EmptyState
              glyph="₹"
              title="No loans recorded"
              message="When you lend money to a friend, add it here to track the due date and get reminded about it."
            />
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  count: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    paddingTop: spacing.xl,
  },
});
