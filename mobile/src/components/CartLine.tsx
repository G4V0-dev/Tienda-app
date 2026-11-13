import { Pressable, StyleSheet, Text, View } from 'react-native';

import { money } from '@/lib/money';
import { colors, radius, spacing } from '@/theme';
import type { CartItem } from '@/types';

type Props = {
  item: CartItem;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onRemove: (id: number) => void;
};

export function CartLine({ item, onIncrement, onDecrement, onRemove }: Props) {
  return (
    <View style={styles.card} testID={`cart-line-${item.id}`}>
      <View style={[styles.swatch, { backgroundColor: item.color }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.lineTotal}>{money(item.price * item.qty)}</Text>
        </View>

        <Text style={styles.unit}>{money(item.price)} c/u</Text>

        <View style={styles.actions}>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar una unidad de ${item.name}`}
              testID={`cart-dec-${item.id}`}
              onPress={() => onDecrement(item.id)}
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              hitSlop={6}
            >
              <Text style={styles.stepLabel}>−</Text>
            </Pressable>

            <Text style={styles.qty} testID={`cart-qty-${item.id}`}>
              {item.qty}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Agregar una unidad de ${item.name}`}
              testID={`cart-inc-${item.id}`}
              onPress={() => onIncrement(item.id)}
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              hitSlop={6}
            >
              <Text style={styles.stepLabel}>+</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${item.name} del carrito`}
            testID={`cart-remove-${item.id}`}
            onPress={() => onRemove(item.id)}
            hitSlop={8}
          >
            <Text style={styles.remove}>Quitar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md
  },
  swatch: {
    width: 8,
    borderRadius: radius.pill
  },
  body: {
    flex: 1,
    gap: spacing.xs
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink
  },
  unit: {
    fontSize: 12,
    color: colors.muted
  },
  actions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 2
  },
  stepButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill
  },
  pressed: {
    backgroundColor: colors.accentSoft
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink
  },
  qty: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink
  },
  remove: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent
  }
});
