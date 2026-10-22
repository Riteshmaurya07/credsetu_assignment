import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { colors, radius, spacing, typography, TOUCH_TARGET } from '../theme/theme';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Six digit one-time-password entry.
 *
 * A single (visually segmented) input keeps the platform keyboard and the
 * autofill behaviour intact while still looking like a code field.
 */
export function OtpInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  error,
}: OtpInputProps): React.JSX.Element {
  const inputRef = useRef<TextInputInstance | null>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, 6);

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Enter the six digit verification code"
        style={[styles.box, focused && styles.boxFocused, error ? styles.boxError : null]}
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const char = digits[index] ?? '';
          return (
            <View
              key={index}
              style={[styles.cell, char ? styles.cellFilled : null, error ? styles.cellError : null]}
            >
              <Text style={styles.digit}>{char}</Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          editable={!disabled}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          caretHidden
          style={styles.hiddenInput}
          accessibilityLabel="Verification code"
        />
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  boxFocused: {
    borderColor: colors.primary,
  },
  boxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  cell: {
    flex: 1,
    height: 56,
    marginHorizontal: 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cellError: {
    borderColor: colors.danger,
  },
  digit: {
    ...typography.title,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    minHeight: TOUCH_TARGET,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
