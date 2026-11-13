import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle
} from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const palette: Record<Variant, { background: string; text: string; border: string }> = {
  primary: { background: colors.ink, text: colors.white, border: colors.ink },
  secondary: { background: colors.surface, text: colors.ink, border: colors.line },
  ghost: { background: 'transparent', text: colors.ink, border: 'transparent' },
  danger: { background: colors.dangerSoft, text: colors.danger, border: colors.dangerSoft }
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  testID
}: Props) {
  const tone = palette[variant];
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: tone.background,
          borderColor: tone.border,
          opacity: blocked ? 0.5 : pressed ? 0.85 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.text} />
      ) : (
        <Text style={[styles.label, { color: tone.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2
  }
});
