import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode
} from 'react';

import {
  cartCount,
  cartReducer,
  cartTotals,
  sanitizeCart
} from '@/lib/cart';
import type { CartItem, CheckoutResponse, Product, Totals } from '@/types';

const CART_KEY = 'tienda.cart.v1';

type CartContextValue = {
  items: CartItem[];
  count: number;
  totals: Totals;
  hydrated: boolean;
  lastOrder: CheckoutResponse | null;
  add: (product: Product) => void;
  increment: (id: number) => void;
  decrement: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  setLastOrder: (order: CheckoutResponse | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [lastOrder, setLastOrder] = useState<CheckoutResponse | null>(null);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(CART_KEY)
      .then((raw) => {
        if (!active) return;

        if (raw) {
          try {
            dispatch({ type: 'hydrate', items: sanitizeCart(JSON.parse(raw)) });
          } catch {
            dispatch({ type: 'clear' });
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => undefined);
  }, [items, hydrated]);

  const add = useCallback((product: Product) => {
    dispatch({ type: 'add', product });
  }, []);

  const increment = useCallback((id: number) => {
    dispatch({ type: 'increment', id });
  }, []);

  const decrement = useCallback((id: number) => {
    dispatch({ type: 'decrement', id });
  }, []);

  const remove = useCallback((id: number) => {
    dispatch({ type: 'remove', id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const totals = useMemo(() => cartTotals(items), [items]);
  const count = useMemo(() => cartCount(items), [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      totals,
      hydrated,
      lastOrder,
      add,
      increment,
      decrement,
      remove,
      clear,
      setLastOrder
    }),
    [items, count, totals, hydrated, lastOrder, add, increment, decrement, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}
