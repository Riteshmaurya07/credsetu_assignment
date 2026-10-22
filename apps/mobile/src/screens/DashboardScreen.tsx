import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { LoanCard } from '../components/LoanCard';
import { SummaryTile } from '../components/SummaryTile';
import { useAuth } from '../auth/AuthContext';
import { useLedger } from '../ledger/LedgerContext';
import { colors, spacing, typography } from '../theme/theme';
import { formatCurrency, formatPhone } from '../utils/format';
import type { MainTabParamList } from '../navigation/types';

export function DashboardScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { loans, summary, isLoading, isRefreshing, error, refresh } = useLedger();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

  const recentLoans = loans.slice(0, 3);
  const pendingCount = summary?.pendingCount ?? 0;

  if (isLoading && !summary) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading your ledger…" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh({ silent: true })}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.phone}>{user ? formatPhone(user.phone) : ''}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.phone.slice(-2) ?? '··'}
          </Text>
        </View>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : null}

      <View style={styles.tilesRow}>
        <SummaryTile
          label="Total lent"
          amount={formatCurrency(summary?.totalLent ?? '0.00')}
          caption={`${summary?.loanCount ?? 0} loan${summary?.loanCount === 1 ? '' : 's'}`}
          glyph="₹"
          tone="primary"
        />
        <SummaryTile
          label="Repaid"
          amount={formatCurrency(summary?.totalRepaid ?? '0.00')}
          caption={`${summary?.repaidCount ?? 0} settled`}
          glyph="✓"
          tone="success"
        />
      </View>

      <View style={styles.tilesRow}>
        <SummaryTile
          label="Overdue"
          amount={formatCurrency(summary?.overdueAmount ?? '0.00')}
          caption={
            (summary?.overdueCount ?? 0) > 0
              ? `${summary?.overdueCount} loan${summary?.overdueCount === 1 ? '' : 's'} past due`
              : 'Nothing past due'
          }
          glyph="!"
          tone={(summary?.overdueCount ?? 0) > 0 ? 'danger' : 'primary'}
        />
        <SummaryTile
          label="Still pending"
          amount={formatCurrency(summary?.pendingAmount ?? '0.00')}
          caption={`${pendingCount} open`}
          glyph="◷"
          tone="primary"
        />
      </View>

      <AppButton
        label="+  Add a loan"
        onPress={() => navigation.navigate('AddLoan')}
        style={styles.addButton}
        accessibilityHint="Opens the form to record a loan given to a friend"
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent loans</Text>
        {loans.length > 0 ? (
          <Text
            accessibilityRole="button"
            style={styles.link}
            onPress={() => navigation.navigate('Loans')}
          >
            View all
          </Text>
        ) : null}
      </View>

      {recentLoans.length === 0 ? (
        <Card>
          <EmptyState
            glyph="₹"
            title="No loans yet"
            message="Add the first loan you gave to a friend and it will show up here with its due date."
          />
        </Card>
      ) : (
        recentLoans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            onRepay={() => navigation.navigate('Loans')}
          />
        ))
      )}
    </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phone: {
    ...typography.title,
    color: colors.text,
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyStrong,
    color: colors.primaryDark,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  addButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  link: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
