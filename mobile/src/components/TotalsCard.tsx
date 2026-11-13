import { StyleSheet, Text, View } from 'react-native';

import { money } from '@/lib/money';
import { colors, spacing } from '@/theme';
import type { Totals } from '@/types';

export function TotalsCard({ totals }: { totals: Totals }) {
  return (
    <View style={styles.card}>
      <View style={styles.line}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value} testID="total-subtotal">
          {money(totals.subtotal)}
        </Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.label}>IVA (19%)</Text>
        <Text style={styles.value} testID="total-iva">
          {money(totals.iva)}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.line}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue} testID="total-final">
          {money(totals.total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 14,
    color: colors.muted
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.xs
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink
  }
});
