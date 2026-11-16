import { Pressable, StyleSheet, Text, View } from 'react-native';

import { money } from '@/lib/money';
import { colors, radius, shadow, spacing } from '@/theme';
import type { Product } from '@/types';

type Props = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function ProductCard({ product, onAdd }: Props) {
  const out = product.stock <= 0;

  return (
    <View style={styles.card}>
      <View style={[styles.thumb, { backgroundColor: product.color }]}>
        <Text style={styles.initial}>{product.name.charAt(0)}</Text>
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {product.description}
      </Text>

      <Text style={[styles.stock, out && styles.stockOut]}>
        {out ? 'Agotado' : `${product.stock} disponibles`}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.price}>{money(product.price)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            out ? `${product.name} agotado` : `Agregar ${product.name} al carrito`
          }
          accessibilityState={{ disabled: out }}
          testID={`product-add-${product.id}`}
          disabled={out}
          onPress={() => onAdd(product)}
          style={({ pressed }) => [
            styles.add,
            out && styles.addDisabled,
            pressed && !out && styles.addPressed
          ]}
          hitSlop={8}
        >
          <Text style={styles.addLabel}>{out ? '—' : '+'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow
  },
  thumb: {
    height: 108,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  initial: {
    fontSize: 40,
    fontWeight: '800',
    color: 'rgba(21, 19, 15, 0.35)'
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    minHeight: 38
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    minHeight: 34
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink
  },
  stock: {
    fontSize: 11,
    color: colors.muted,
    marginTop: -2
  },
  stockOut: {
    color: colors.accent,
    fontWeight: '700'
  },
  add: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addDisabled: {
    backgroundColor: colors.line
  },
  addPressed: {
    backgroundColor: colors.accent
  },
  addLabel: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600'
  }
});
