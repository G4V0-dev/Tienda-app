import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.ink} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background
  },
  label: {
    color: colors.muted,
    fontSize: 13
  }
});
