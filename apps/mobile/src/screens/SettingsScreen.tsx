import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { useLedger } from '../ledger/LedgerContext';
import { getBaseUrl } from '../api/client';
import { colors, spacing, typography } from '../theme/theme';
import { formatCurrency, formatPhone, maskPhone } from '../utils/format';

export function SettingsScreen(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { summary } = useLedger();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to request a new code to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsSigningOut(true);
            try {
              await logout();
            } finally {
              setIsSigningOut(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Settings</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Signed in as</Text>
        <Text style={styles.phone}>{user ? formatPhone(user.phone) : '-'}</Text>
        <Text style={styles.muted}>Stored on this device in the secure keystore</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Ledger snapshot</Text>
        <Row label="Total lent" value={formatCurrency(summary?.totalLent ?? '0.00')} />
        <Row label="Total repaid" value={formatCurrency(summary?.totalRepaid ?? '0.00')} />
        <Row label="Pending" value={formatCurrency(summary?.pendingAmount ?? '0.00')} />
        <Row label="Overdue" value={formatCurrency(summary?.overdueAmount ?? '0.00')} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Connection</Text>
        <Row label="API base URL" value={getBaseUrl()} />
        <Row label="Account id" value={user?.id.slice(0, 8) ?? '-'} />
        <Text style={styles.muted}>
          On an Android emulator the host machine is 10.0.2.2. On a physical phone set
          EXPO_PUBLIC_API_URL to the LAN IP of the computer running the API.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.muted}>
          MiniLedger keeps track of the money you lend to friends. Amounts are stored as exact
          decimals, so ₹1,500.50 stays ₹1,500.50.
        </Text>
        <Text style={styles.muted}>Signed in as {user ? maskPhone(user.phone) : '-'} (masked).</Text>
      </Card>

      <AppButton
        label="Sign out"
        variant="danger"
        onPress={confirmSignOut}
        loading={isSigningOut}
        style={styles.signOut}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  phone: {
    ...typography.title,
    color: colors.text,
  },
  muted: {
    ...typography.caption,
    color: colors.textSubtle,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  rowValue: {
    ...typography.bodyStrong,
    color: colors.text,
    marginLeft: spacing.md,
    flexShrink: 1,
  },
  signOut: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
