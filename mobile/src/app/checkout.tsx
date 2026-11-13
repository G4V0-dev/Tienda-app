import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { TotalsCard } from '@/components/TotalsCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ApiError, checkout } from '@/lib/api';
import { money } from '@/lib/money';
import {
  DEMO_CARD,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  validateCard
} from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';
import type { CardInput } from '@/types';

export default function CheckoutScreen() {
  const { token, user, signOut } = useAuth();
  const { items, totals, clear, setLastOrder } = useCart();

  const [card, setCard] = useState<CardInput>({
    ...DEMO_CARD,
    name: user?.name || DEMO_CARD.name
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!token) return <Redirect href="/login" />;
  if (!items.length && !submitting) return <Redirect href="/cart" />;

  function update(field: keyof CardInput, value: string) {
    setCard((current) => ({ ...current, [field]: value }));
  }

  async function pay() {
    const validation = validateCard(card);
    if (validation) {
      setError(validation);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = await checkout(
        token as string,
        items.map((item) => ({ id: item.id, qty: item.qty })),
        card
      );

      setLastOrder(data);
      clear();
      router.replace('/success');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        clear();
        await signOut();
        router.replace('/login');
        return;
      }

      setError(
        caught instanceof Error ? caught.message : 'No se pudo completar el pago.'
      );
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Pasarela ficticia</Text>
          <Text style={styles.bannerText}>
            No se cobra dinero real. Los datos vienen precargados para probar el flujo.
          </Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Resumen del pedido</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryLine}>
              <Text style={styles.summaryName} numberOfLines={1}>
                {item.name} × {item.qty}
              </Text>
              <Text style={styles.summaryValue}>{money(item.price * item.qty)}</Text>
            </View>
          ))}
        </View>

        <TotalsCard totals={totals} />

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Tarjeta</Text>

          <Field
            label="Nombre en la tarjeta"
            value={card.name}
            onChangeText={(value) => update('name', value)}
            placeholder="Como aparece en la tarjeta"
            autoComplete="cc-name"
            testID="card-name"
          />
          <Field
            label="Número de tarjeta"
            value={card.number}
            onChangeText={(value) => update('number', formatCardNumber(value))}
            placeholder="4242 4242 4242 4242"
            keyboardType="number-pad"
            maxLength={19}
            autoComplete="cc-number"
            testID="card-number"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="Vencimiento"
                value={card.expiry}
                onChangeText={(value) => update('expiry', formatExpiry(value))}
                placeholder="MM/AA"
                keyboardType="number-pad"
                maxLength={5}
                autoComplete="cc-exp"
                testID="card-expiry"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="CVV"
                value={card.cvv}
                onChangeText={(value) => update('cvv', formatCvv(value))}
                placeholder="123"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoComplete="cc-csc"
                testID="card-cvv"
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={`Pagar ${money(totals.total)}`}
            onPress={pay}
            loading={submitting}
            testID="pay-submit"
          />
        </View>

        <Text style={styles.note}>
          Al confirmar, el servidor valida precios y cantidades, calcula el IVA con
          el microservicio y guarda la orden.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  summaryName: {
    flex: 1,
    fontSize: 14,
    color: colors.ink
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink
  },
  form: {
    gap: spacing.lg
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  half: {
    flex: 1
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted
  }
});
