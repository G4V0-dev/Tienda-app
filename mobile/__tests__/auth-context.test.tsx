import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
  login: jest.fn(),
  register: jest.fn()
}));

import { getMe, login } from '@/lib/api';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

const mockGetMe = getMe as jest.Mock;
const mockLogin = login as jest.Mock;

const user: User = {
  id: 'user-1',
  name: 'Ana Pérez',
  email: 'ana@example.com'
};

function Probe() {
  const { token, user: currentUser, loading, signIn, signOut } = useAuth();

  return (
    <View>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="token">{token || 'sin-token'}</Text>
      <Text testID="user">{currentUser?.name || 'sin-usuario'}</Text>
      <Pressable
        testID="sign-in"
        onPress={() => signIn('ANA@example.com', 'secreto123')}
      >
        <Text>Entrar</Text>
      </Pressable>
      <Pressable testID="sign-out" onPress={signOut}>
        <Text>Salir</Text>
      </Pressable>
    </View>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockGetMe.mockResolvedValue({ user });
});

describe('AuthProvider', () => {
  it('restaura el token guardado y refresca el usuario con /me', async () => {
    await AsyncStorage.setItem('tienda.token', 'jwt-guardado');
    await AsyncStorage.setItem('tienda.user', JSON.stringify(user));

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );

    expect(screen.getByTestId('token')).toHaveTextContent('jwt-guardado');
    expect(screen.getByTestId('user')).toHaveTextContent('Ana Pérez');
    expect(mockGetMe).toHaveBeenCalledWith('jwt-guardado');
  });

  it('limpia la sesión si el token expiró', async () => {
    await AsyncStorage.setItem('tienda.token', 'jwt-vencido');
    await AsyncStorage.setItem('tienda.user', JSON.stringify(user));
    mockGetMe.mockRejectedValue(new Error('Sesión inválida'));

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );

    expect(screen.getByTestId('token')).toHaveTextContent('sin-token');
    expect(screen.getByTestId('user')).toHaveTextContent('sin-usuario');
    expect(await AsyncStorage.getItem('tienda.token')).toBeNull();
  });

  it('inicia sesión normalizando el correo y persiste la sesión', async () => {
    mockLogin.mockResolvedValue({ token: 'jwt-nuevo', user });

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );

    fireEvent.press(screen.getByTestId('sign-in'));

    await waitFor(() =>
      expect(screen.getByTestId('token')).toHaveTextContent('jwt-nuevo')
    );

    expect(mockLogin).toHaveBeenCalledWith('ana@example.com', 'secreto123');
    expect(await AsyncStorage.getItem('tienda.token')).toBe('jwt-nuevo');
    expect(await AsyncStorage.getItem('tienda.user')).toContain('Ana Pérez');
  });

  it('cierra sesión y borra el almacenamiento', async () => {
    await AsyncStorage.setItem('tienda.token', 'jwt-guardado');
    await AsyncStorage.setItem('tienda.user', JSON.stringify(user));

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('Ana Pérez')
    );

    fireEvent.press(screen.getByTestId('sign-out'));

    await waitFor(() =>
      expect(screen.getByTestId('token')).toHaveTextContent('sin-token')
    );

    expect(await AsyncStorage.getItem('tienda.token')).toBeNull();
    expect(await AsyncStorage.getItem('tienda.user')).toBeNull();
  });
});
