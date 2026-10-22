import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, radius, spacing, typography, TOUCH_TARGET } from '../theme/theme';
import { formatDate, toDateString } from '../utils/format';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  error?: string | null;
  hint?: string;
}

/** Due date picker with a native calendar sheet. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
  hint,
}: DateFieldProps): React.JSX.Element {
  const [showPicker, setShowPicker] = useState(false);

  const selectedDate = (() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return new Date();
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  })();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !date) return;
    onChange(toDateString(date));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatDate(value)}`}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [styles.valueWrapper, error ? styles.errorBorder : null, pressed && styles.pressed]}
      >
        <Text style={styles.value}>{formatDate(value)}</Text>
        <Text style={styles.action}>Change</Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  valueWrapper: {
    minHeight: TOUCH_TARGET + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  errorBorder: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  pressed: {
    opacity: 0.8,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  action: {
    ...typography.label,
    color: colors.primary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
});
