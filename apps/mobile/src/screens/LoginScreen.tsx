import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { Banner } from '../components/Banner';
import { CountryPicker } from '../components/CountryPicker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { errorMessage, useAuth } from '../auth/AuthContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { onlyDigits, toInternationalPhone, validatePhone } from '../utils/validation';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { sendOtp } = useAuth();
  const [countryCode, setCountryCode] = useState('IN');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCode = async () => {
    setError(null);
    setFieldError(null);

    const validation = validatePhone(phone, countryCode);
    if (validation) {
      setFieldError(validation);
      return;
    }

    const international = toInternationalPhone(phone, countryCode);
    setIsSubmitting(true);
    try {
      const canonical = await sendOtp(international, countryCode);
      navigation.navigate('Otp', {
        phone: canonical,
        countryCode,
        resendAvailableInSeconds: 30,
      });
    } catch (caught) {
      setError(errorMessage(caught, 'The verification code could not be sent.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>₹</Text>
        </View>
        <Text style={styles.title}>MiniLedger</Text>
        <Text style={styles.subtitle}>
          Keep track of every rupee you lend to friends - and get it back on time.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in</Text>
        <Text style={styles.cardSubtitle}>
          We will send a 6-digit code to verify your phone number.
        </Text>

        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

        <View style={styles.phoneRow}>
          <CountryPicker value={countryCode} onChange={setCountryCode} />
          <TextField
            label="Phone number"
            containerStyle={styles.phoneField}
            value={phone}
            onChangeText={(text) => {
              setPhone(onlyDigits(text).slice(0, 15));
              setFieldError(null);
            }}
            onSubmitEditing={() => void handleSendCode()}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="9876543210"
            maxLength={15}
            error={fieldError}
            returnKeyType="send"
          />
        </View>

        <AppButton
          label="Send verification code"
          onPress={() => void handleSendCode()}
          loading={isSubmitting}
          accessibilityHint="Requests a one time password for your phone number"
        />

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Mock OTP</Text>
          <Text style={styles.noteText}>
            This demo has no SMS provider. The generated code is printed in the API terminal
            (look for a line starting with [MOCK OTP]).
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        {countryCode === 'IN' ? 'India' : ''} · Your data stays on this device
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  cardTitle: {
    ...typography.title,
    color: colors.text,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phoneField: {
    flex: 1,
  },
  noteBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteTitle: {
    ...typography.label,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  noteText: {
    ...typography.caption,
    color: colors.primaryDark,
    lineHeight: 18,
  },
  footer: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
