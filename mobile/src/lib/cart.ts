import type { CartItem, Product, Totals } from '@/types';

export const MAX_QTY = 99;
export const IVA_RATE = 0.19;

export type CartAction =
  | { type: 'add'; product: Product }
  | { type: 'increment'; id: number }
  | { type: 'decrement'; id: number }
  | { type: 'remove'; id: number }
  | { type: 'clear' }
  | { type: 'hydrate'; items: CartItem[] };

function clampQty(value: number): number {
  const qty = Math.trunc(Number(value) || 0);
  return Math.min(MAX_QTY, Math.max(0, qty));
}

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = items.find((item) => item.id === action.product.id);

      if (existing) {
        return items.map((item) =>
          item.id === action.product.id
            ? { ...item, qty: clampQty(item.qty + 1) }
            : item
        );
      }

      return [
        ...items,
        {
          id: action.product.id,
          name: action.product.name,
          price: action.product.price,
          color: action.product.color,
          qty: 1
        }
      ];
    }

    case 'increment':
      return items.map((item) =>
        item.id === action.id ? { ...item, qty: clampQty(item.qty + 1) } : item
      );

    case 'decrement':
      return items
        .map((item) =>
          item.id === action.id ? { ...item, qty: clampQty(item.qty - 1) } : item
        )
        .filter((item) => item.qty > 0);

    case 'remove':
      return items.filter((item) => item.id !== action.id);

    case 'clear':
      return [];

    case 'hydrate':
      return sanitizeCart(action.items);

    default:
      return items;
  }
}

export function cartTotals(items: CartItem[]): Totals {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0
  );
  const iva = Math.round(subtotal * IVA_RATE);

  return { subtotal, iva, total: subtotal + iva };
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const result: CartItem[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;

    const candidate = raw as Partial<CartItem>;
    const id = Number(candidate.id);
    const price = Number(candidate.price);
    const qty = Math.min(MAX_QTY, Math.max(1, Math.trunc(Number(candidate.qty) || 1)));

    if (!Number.isFinite(id) || !Number.isFinite(price) || price < 0) continue;
    if (seen.has(id)) continue;

    seen.add(id);
    result.push({
      id,
      name: String(candidate.name || 'Producto'),
      price,
      qty,
      color: String(candidate.color || '#E3DCCF')
    });
  }

  return result;
}
