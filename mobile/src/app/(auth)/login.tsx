import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, shadow, spacing } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.mark}>
              <Text style={styles.markText}>TB</Text>
            </View>
            <Text style={styles.eyebrow}>TIENDA BÁSICA</Text>
            <Text style={styles.title}>Tu ropa esencial, sin complicaciones.</Text>
            <Text style={styles.subtitle}>
              Carrito, IVA y factura PDF en un solo flujo.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              testID="login-email"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              autoComplete="current-password"
              testID="login-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Ingresar"
              onPress={submit}
              loading={loading}
              testID="login-submit"
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>¿No tienes cuenta?</Text>
              <Pressable onPress={() => router.push('/register')} hitSlop={8}>
                <Text style={styles.link}>Crear cuenta</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>
            Demo: regístrate con cualquier correo. La tarjeta de prueba se rellena
            automáticamente en el pago.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl
  },
  hero: {
    gap: spacing.sm
  },
  mark: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  markText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.accent
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs
  },
  footerText: {
    color: colors.muted,
    fontSize: 14
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800'
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center'
  }
});
