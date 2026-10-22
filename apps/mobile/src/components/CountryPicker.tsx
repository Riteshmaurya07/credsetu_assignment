import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COUNTRIES } from '../types/api';
import { colors, radius, spacing, typography, TOUCH_TARGET } from '../theme/theme';

interface CountryPickerProps {
  value: string;
  onChange: (iso: string) => void;
}

/** Accessible country code selector used by the phone entry screen. */
export function CountryPicker({ value, onChange }: CountryPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => COUNTRIES.find((country) => country.iso === value) ?? COUNTRIES[0],
    [value],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Country code, currently ${selected?.name ?? ''}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.flag}>{selected?.iso ?? 'IN'}</Text>
        <Text style={styles.dial}>+{selected?.dialCode ?? '91'}</Text>
        <View style={styles.caretBox}>
          <Text style={styles.caret}>▾</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Select your country</Text>
            <ScrollView style={styles.list}>
              {COUNTRIES.map((country) => {
                const isSelected = country.iso === selected?.iso;
                return (
                  <Pressable
                    key={country.iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(country.iso);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  >
                    <View>
                      <Text style={styles.optionName}>{country.name}</Text>
                      <Text style={styles.optionMeta}>
                        +{country.dialCode} · {country.nationalLength} digits
                      </Text>
                    </View>
                    {isSelected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  flag: {
    ...typography.caption,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 1,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  dial: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  caretBox: {
    marginLeft: spacing.xs,
  },
  caret: {
    color: colors.textMuted,
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  sheetTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET + 8,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  optionName: {
    ...typography.body,
    color: colors.text,
  },
  optionMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  check: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  closeButton: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
