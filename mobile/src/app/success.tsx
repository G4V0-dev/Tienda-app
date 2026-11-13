import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TotalsCard } from '@/components/TotalsCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { dateLabel, money, shortId } from '@/lib/money';
import { downloadAndShareReceipt } from '@/lib/receipt';
import { colors, radius, shadow, spacing } from '@/theme';

export default function SuccessScreen() {
  const { token } = useAuth();
  const { lastOrder, setLastOrder } = useCart();
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  if (!lastOrder || !token) return <Redirect href="/" />;

  const { order, items, customer, iva_fallback: ivaFallback } = lastOrder;

  async function download() {
    setDownloading(true);
    setFailed(false);
    setMessage('Generando factura PDF…');

    try {
      await downloadAndShareReceipt(order.id, token as string);
      setMessage(
        Platform.OS === 'web'
          ? 'Factura descargada.'
          : 'Factura lista. Elige dónde guardarla o compartirla.'
      );
    } catch (caught) {
      setFailed(true);
      setMessage(
        caught instanceof Error ? caught.message : 'No se pudo generar la factura.'
      );
    } finally {
      setDownloading(false);
    }
  }

  function continueShopping() {
    setLastOrder(null);
    router.replace('/');
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.check}>
            <Ionicons name="checkmark" size={34} color={colors.white} />
          </View>
          <Text style={styles.title}>Pago aprobado</Text>
          <Text style={styles.subtitle}>
            Tu pedido quedó confirmado. La factura está lista para descargar.
          </Text>
        </View>

        {ivaFallback ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              El microservicio de IVA no respondió; el impuesto se calculó localmente.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pedido</Text>
            <Text style={styles.metaValue}>{shortId(order.id)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Transacción</Text>
            <Text style={styles.metaValue}>{order.transaction_id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{dateLabel(order.created_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tarjeta</Text>
            <Text style={styles.metaValue}>**** {order.card_last4}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {customer.name}
            </Text>
          </View>

          <View style={styles.divider} />

          {items.map((item) => (
            <View key={item.product_id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name} × {item.qty}
              </Text>
              <Text style={styles.itemValue}>{money(item.line_total)}</Text>
            </View>
          ))}
        </View>

        <TotalsCard
          totals={{
            subtotal: order.subtotal,
            iva: order.iva,
            total: order.total
          }}
        />

        <Button
          title="Descargar factura PDF"
          onPress={download}
          loading={downloading}
          testID="download-receipt"
        />

        {message ? (
          <Text style={[styles.message, failed && styles.messageError]}>
            {message}
          </Text>
        ) : null}

        <Button
          title="Seguir comprando"
          variant="secondary"
          onPress={continueShopping}
          testID="continue-shopping"
        />

        <Text style={styles.disclaimer}>
          Comprobante ficticio sin validez fiscal. Generado por el microservicio PDF.
        </Text>
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
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg
  },
  check: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.ink,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 300
  },
  warning: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  metaLabel: {
    fontSize: 12,
    color: colors.muted
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right'
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.xs
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: colors.ink
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.success,
    textAlign: 'center'
  },
  messageError: {
    color: colors.danger
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: 'center'
  }
});
