import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { CardInput, CheckoutResponse, Product, User } from '@/types';

const FALLBACK_PORT = 3000;

export function resolveApiUrl(
  configured: string | undefined,
  hostUri: string | undefined,
  platform: string
): string {
  const explicit = configured?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${FALLBACK_PORT}`;

  if (platform === 'android') return `http://10.0.2.2:${FALLBACK_PORT}`;
  return `http://localhost:${FALLBACK_PORT}`;
}

export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
  Platform.OS
);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con la tienda en ${API_URL}. Revisa que el backend esté corriendo.`,
      0
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Error ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function getProducts(): Promise<Product[]> {
  return apiRequest('/api/products');
}

export function getMe(token: string): Promise<{ user: User }> {
  return apiRequest('/api/auth/me', { token });
}

export function login(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export function register(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, password }
  });
}

export function checkout(
  token: string,
  items: { id: number; qty: number }[],
  card: CardInput
): Promise<CheckoutResponse> {
  return apiRequest('/api/checkout', {
    method: 'POST',
    token,
    body: { items, card }
  });
}
