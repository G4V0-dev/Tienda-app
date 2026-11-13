import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import { getMe, login, register } from '@/lib/api';
import type { User } from '@/types';

const TOKEN_KEY = 'tienda.token';
const USER_KEY = 'tienda.user';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (!storedToken) return;

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser) as User);
          } catch {
            await AsyncStorage.removeItem(USER_KEY);
          }
        }

        setToken(storedToken);

        try {
          const data = await getMe(storedToken);
          if (!active) return;
          setUser(data.user);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)).catch(
            () => undefined
          );
        } catch {
          if (!active) return;
          setToken(null);
          setUser(null);
          await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(
            () => undefined
          );
        }
      } catch {
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    restore();

    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback(
    async (session: { token: string; user: User }) => {
      setToken(session.token);
      setUser(session.user);
      await AsyncStorage.multiSet([
        [TOKEN_KEY, session.token],
        [USER_KEY, JSON.stringify(session.user)]
      ]).catch(() => undefined);
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await login(email.trim().toLowerCase(), password);
      await persistSession(session);
    },
    [persistSession]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await register(
        name.trim(),
        email.trim().toLowerCase(),
        password
      );
      await persistSession(session);
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, signIn, signUp, signOut }),
    [token, user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
