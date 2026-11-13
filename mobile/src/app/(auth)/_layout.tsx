import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { token, loading } = useAuth();

  if (loading) return <LoadingScreen label="Recuperando sesión…" />;
  if (token) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    />
  );
}
