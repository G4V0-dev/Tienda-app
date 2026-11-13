import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { API_URL } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { clear } = useCart();

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  function confirmLogout() {
    Alert.alert('Cerrar sesión', 'Se borrará tu carrito local. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          clear();
          await signOut();
          router.replace('/login');
        }
      }
    ]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>TU CUENTA</Text>
        <Text style={styles.title}>Cuenta</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.name || 'Cliente'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="server-outline" size={18} color={colors.ink} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Backend conectado</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {API_URL}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="card-outline" size={18} color={colors.ink} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Pago simulado</Text>
              <Text style={styles.rowValue}>
                No se cobra dinero real. Usa la tarjeta 4242 4242 4242 4242.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="document-text-outline" size={18} color={colors.ink} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Factura PDF</Text>
              <Text style={styles.rowValue}>
                Se genera en el microservicio PDF y se comparte desde tu teléfono.
              </Text>
            </View>
          </View>
        </View>

        <Button
          title="Cerrar sesión"
          variant="danger"
          onPress={confirmLogout}
          testID="logout"
        />
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  profileText: {
    flex: 1,
    gap: 2
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink
  },
  email: {
    fontSize: 13,
    color: colors.muted
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowBody: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink
  },
  rowValue: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted
  },
  divider: {
    height: 1,
    backgroundColor: colors.line
  }
});
