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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Nombre, correo y contraseña son obligatorios.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signUp(name, email, password);
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la cuenta.');
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
            <Text style={styles.eyebrow}>TIENDA BÁSICA</Text>
            <Text style={styles.title}>Crea tu cuenta y arma tu carrito.</Text>
            <Text style={styles.subtitle}>
              El pago es ficticio y tu factura se descarga en PDF.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Crear cuenta</Text>

            <Field
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              autoComplete="name"
              testID="register-name"
            />
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              testID="register-email"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              autoComplete="new-password"
              testID="register-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Crear cuenta"
              onPress={submit}
              loading={loading}
              testID="register-submit"
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
              <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={styles.link}>Ingresar</Text>
              </Pressable>
            </View>
          </View>
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.accent
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4
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
  }
});
