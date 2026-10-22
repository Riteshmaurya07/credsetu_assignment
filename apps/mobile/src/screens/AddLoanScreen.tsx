import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppButton } from '../components/AppButton';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { DateField } from '../components/DateField';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { errorMessage, useAuth } from '../auth/AuthContext';
import { useLedger } from '../ledger/LedgerContext';
import { uploadReceipt } from '../api/endpoints';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCurrency, todayDateString } from '../utils/format';
import { validateAmount, validateFriendName } from '../utils/validation';
import type { MainTabParamList } from '../navigation/types';

interface FieldErrors {
  friendName?: string | null;
  amount?: string | null;
  dueDate?: string | null;
}

export function AddLoanScreen(): React.JSX.Element {
  const { addLoan } = useLedger();
  const { token } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayDateString());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);

  const pickReceipt = async () => {
    setReceiptNote(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setReceiptNote('Photo library permission is needed to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setReceiptNote('That image could not be read. Please try another one.');
      return;
    }
    setReceipt({
      uri: asset.uri,
      name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const submit = async () => {
    setFormError(null);
    const nextErrors: FieldErrors = {
      friendName: validateFriendName(friendName),
      amount: validateAmount(amount).error,
      dueDate: null,
    };
    setErrors(nextErrors);
    if (nextErrors.friendName || nextErrors.amount) return;

    const canonicalAmount = validateAmount(amount).amount;
    if (!canonicalAmount) return;

    setIsSubmitting(true);
    try {
      const loan = await addLoan({
        friendName: friendName.trim(),
        amount: canonicalAmount,
        dueDate,
      });

      if (receipt && token) {
        try {
          await uploadReceipt(token, loan.id, receipt);
        } catch (caught) {
          setReceiptNote(errorMessage(caught, 'The loan was saved but the receipt was not uploaded.'));
        }
      }

      setFriendName('');
      setAmount('');
      setDueDate(todayDateString());
      setReceipt(null);
      navigation.navigate('Loans');
    } catch (caught) {
      setFormError(errorMessage(caught, 'The loan could not be saved. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Add a loan</Text>
        <Text style={styles.subtitle}>Record money you lent to a friend and when it is due.</Text>
      </View>

      {formError ? <Banner message={formError} onDismiss={() => setFormError(null)} /> : null}
      {receiptNote ? <Banner message={receiptNote} tone="info" onDismiss={() => setReceiptNote(null)} /> : null}

      <Card style={styles.form}>
        <TextField
          label="Friend's name"
          value={friendName}
          onChangeText={(text) => {
            setFriendName(text);
            setErrors((current) => ({ ...current, friendName: null }));
          }}
          placeholder="e.g. Rahul Sharma"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={80}
          error={errors.friendName}
          returnKeyType="next"
        />

        <TextField
          label="Amount"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setErrors((current) => ({ ...current, amount: null }));
          }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix="₹"
          maxLength={16}
          error={errors.amount}
          hint="Use up to two decimal places."
          returnKeyType="done"
        />

        <DateField
          label="Due date"
          value={dueDate}
          onChange={(value) => setDueDate(value)}
          minimumDate={new Date()}
          hint="Loans due today are not overdue - they turn overdue from the next day."
        />

        <Text style={styles.optionalLabel}>Receipt (optional)</Text>
        {receipt ? (
          <View style={styles.receiptBox}>
            <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
            <View style={styles.receiptText}>
              <Text style={styles.receiptName} numberOfLines={1}>
                {receipt.name}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setReceipt(null)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach a receipt photo"
            onPress={() => void pickReceipt()}
            style={({ pressed }) => [styles.receiptPicker, pressed && styles.pressed]}
          >
            <Text style={styles.receiptPickerLabel}>▣  Attach a photo</Text>
          </Pressable>
        )}

        <AppButton
          label="Save loan"
          onPress={() => void submit()}
          loading={isSubmitting}
          style={styles.saveButton}
          accessibilityHint="Saves the loan and shows it in your list"
        />
      </Card>

      {amount && !errors.amount ? (
        <Text style={styles.preview}>You are lending {formatCurrency(amount)} - due {dueDate}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  form: {
    padding: spacing.lg,
  },
  optionalLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  receiptPicker: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.75,
  },
  receiptPickerLabel: {
    ...typography.bodyStrong,
    color: colors.textMuted,
  },
  receiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  receiptImage: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  receiptText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  receiptName: {
    ...typography.body,
    color: colors.text,
  },
  remove: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
