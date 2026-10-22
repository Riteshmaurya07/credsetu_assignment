import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { Banner } from '../components/Banner';
import { OtpInput } from '../components/OtpInput';
import { Screen } from '../components/Screen';
import { errorMessage, useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, typography, TOUCH_TARGET } from '../theme/theme';
import { formatPhone } from '../utils/format';
import { validateOtp } from '../utils/validation';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function OtpScreen({ navigation, route }: Props): React.JSX.Element {
  const { phone, countryCode } = route.params;
  const { confirmOtp, sendOtp } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [resendIn, setResendIn] = useState(route.params.resendAvailableInSeconds ?? 30);
  const [isResending, setIsResending] = useState(false);

  // Countdown for the code expiry.
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const verify = useCallback(async () => {
    setError(null);
    const validation = validateOtp(code);
    if (validation) {
      setError(validation);
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmOtp(phone, code, countryCode);
      // The navigator switches to the main tabs once the session is active.
    } catch (caught) {
      setError(errorMessage(caught, 'That code could not be verified.'));
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, confirmOtp, phone, countryCode]);

  const resend = useCallback(async () => {
    setError(null);
    setIsResending(true);
    try {
      await sendOtp(phone, countryCode);
      setSecondsLeft(5 * 60);
      setResendIn(30);
      setCode('');
    } catch (caught) {
      setError(errorMessage(caught, 'A new code could not be sent.'));
    } finally {
      setIsResending(false);
    }
  }, [sendOtp, phone, countryCode]);

  const canResend = resendIn <= 0 && !isResending;

  return (
    <Screen scroll>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back to the phone number"
        onPress={() => navigation.goBack()}
        style={styles.back}
      >
        <Text style={styles.backLabel}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {formatPhone(phone)}. Check the API terminal to read it.
        </Text>
      </View>

      {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

      <OtpInput value={code} onChange={setCode} onSubmit={() => void verify()} error={null} />

      <View style={styles.timerRow}>
        <Text style={styles.timer}>
          {secondsLeft > 0 ? `Code expires in ${formatCountdown(secondsLeft)}` : 'The code has expired'}
        </Text>
        <Text style={styles.timer}>Resend in {formatCountdown(resendIn)}</Text>
      </View>

      <AppButton
        label="Verify and continue"
        onPress={() => void verify()}
        loading={isSubmitting}
        disabled={code.length !== 6}
        accessibilityHint="Verifies the code and signs you in"
      />

      <AppButton
        label={canResend ? 'Resend code' : `Resend code (${formatCountdown(resendIn)})`}
        variant="ghost"
        onPress={() => void resend()}
        disabled={!canResend}
        loading={isResending}
      />

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Trouble signing in?</Text>
        <Text style={styles.helpText}>
          The code is printed in the API terminal on the computer running the backend. It expires
          after 5 minutes and can be used only once.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  backLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  timer: {
    ...typography.caption,
    color: colors.textMuted,
  },
  helpBox: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  helpText: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
