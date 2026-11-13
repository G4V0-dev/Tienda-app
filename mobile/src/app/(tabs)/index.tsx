import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Button } from '@/components/Button';
import { ProductCard } from '@/components/ProductCard';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getProducts } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';
import type { Product } from '@/types';

export default function CatalogScreen() {
  const { user } = useAuth();
  const { add, count } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setProducts(await getProducts());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar el catálogo.'
      );
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onAdd = useCallback(
    (product: Product) => {
      add(product);
      setNotice(`${product.name} agregado al carrito`);
    },
    [add]
  );

  const firstName = (user?.name || 'Cliente').split(' ')[0];

  return (
    <Screen>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>HOLA, {firstName.toUpperCase()}</Text>
                <Text style={styles.title}>Catálogo</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ir al carrito"
                onPress={() => router.push('/cart')}
                style={({ pressed }) => [
                  styles.cartShortcut,
                  pressed && styles.cartShortcutPressed
                ]}
              >
                <Ionicons name="bag-handle-outline" size={22} color={colors.ink} />
                {count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            <Text style={styles.subtitle}>
              Ropa básica, precios claros. El IVA del 19% se calcula al pagar.
            </Text>

            {notice ? (
              <View style={styles.notice}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} onAdd={onAdd} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.ink} />
              <Text style={styles.stateText}>Cargando catálogo…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>No hay conexión con la tienda</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Reintentar" variant="secondary" onPress={load} />
            </View>
          ) : (
            <View style={styles.state}>
              <Text style={styles.stateText}>El catálogo está vacío.</Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  column: {
    gap: spacing.md
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerText: {
    gap: 2
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
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    maxWidth: 300
  },
  cartShortcut: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cartShortcutPressed: {
    backgroundColor: colors.accentSoft
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800'
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  noticeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl
  },
  stateText: {
    color: colors.muted,
    fontSize: 13
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted
  }
});
