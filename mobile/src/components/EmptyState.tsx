import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = {
  icon: string;
  title: string;
  message: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon, title, message, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: 26
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center'
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280
  }
});
