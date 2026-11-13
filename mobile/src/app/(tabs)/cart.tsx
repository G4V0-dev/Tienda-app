import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CartLine } from '@/components/CartLine';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TotalsCard } from '@/components/TotalsCard';
import { useCart } from '@/contexts/CartContext';
import { money } from '@/lib/money';
import { colors, spacing } from '@/theme';

export default function CartScreen() {
  const {
    items,
    count,
    totals,
    increment,
    decrement,
    remove,
    clear
  } = useCart();

  function confirmClear() {
    Alert.alert('Vaciar carrito', '¿Quieres quitar todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clear }
    ]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>TU SELECCIÓN</Text>
            <Text style={styles.title}>Carrito</Text>
          </View>
          {items.length > 0 ? (
            <Text style={styles.count}>
              {count} {count === 1 ? 'unidad' : 'unidades'}
            </Text>
          ) : null}
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="Tu carrito está vacío"
            message="Agrega productos del catálogo. Conservamos tu carrito aunque cierres la app."
          >
            <Button
              title="Explorar catálogo"
              onPress={() => router.push('/')}
              style={styles.emptyButton}
            />
          </EmptyState>
        ) : (
          <>
            <View style={styles.lines}>
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onIncrement={increment}
                  onDecrement={decrement}
                  onRemove={remove}
                />
              ))}
            </View>

            <Pressable onPress={confirmClear} hitSlop={8} style={styles.clear}>
              <Ionicons name="trash-outline" size={15} color={colors.accent} />
              <Text style={styles.clearText}>Vaciar carrito</Text>
            </Pressable>

            <TotalsCard totals={totals} />

            <Text style={styles.note}>
              Los precios y el IVA se recalculan en el servidor al confirmar el pago.
            </Text>

            <Button
              title={`Pagar ${money(totals.total)}`}
              onPress={() => router.push('/checkout')}
              testID="go-checkout"
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.accent
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.ink
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.sm
  },
  lines: {
    gap: spacing.md
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start'
  },
  clearText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700'
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm
  }
});
