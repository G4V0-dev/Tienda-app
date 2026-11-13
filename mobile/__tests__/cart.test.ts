import {
  MAX_QTY,
  cartCount,
  cartReducer,
  cartTotals,
  sanitizeCart
} from '@/lib/cart';
import type { CartItem, Product } from '@/types';

const shirt: Product = {
  id: 1,
  name: 'Camiseta Clásica',
  description: 'Algodón 100%',
  price: 45000,
  color: '#dbe4ee'
};

const hoodie: Product = {
  id: 4,
  name: 'Hoodie Urbano',
  description: 'Felpa suave',
  price: 120000,
  color: '#d6d6e3'
};

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    name: 'Camiseta Clásica',
    price: 45000,
    qty: 1,
    color: '#dbe4ee',
    ...overrides
  };
}

describe('cartReducer', () => {
  it('agrega un producto nuevo con cantidad 1', () => {
    const result = cartReducer([], { type: 'add', product: shirt });

    expect(result).toEqual([item()]);
  });

  it('acumula la cantidad al agregar el mismo producto', () => {
    const result = cartReducer([item({ qty: 2 })], { type: 'add', product: shirt });

    expect(result[0].qty).toBe(3);
  });

  it('respeta el máximo de 99 unidades', () => {
    const result = cartReducer([item({ qty: MAX_QTY })], {
      type: 'add',
      product: shirt
    });

    expect(result[0].qty).toBe(MAX_QTY);
  });

  it('incrementa y decrementa sin mutar el estado original', () => {
    const initial = [item({ qty: 2 })];
    const increased = cartReducer(initial, { type: 'increment', id: 1 });
    const decreased = cartReducer(initial, { type: 'decrement', id: 1 });

    expect(increased[0].qty).toBe(3);
    expect(decreased[0].qty).toBe(1);
    expect(initial[0].qty).toBe(2);
  });

  it('elimina la línea cuando la cantidad llega a cero', () => {
    const result = cartReducer([item({ qty: 1 })], { type: 'decrement', id: 1 });

    expect(result).toHaveLength(0);
  });

  it('quita un producto específico y vacía el carrito', () => {
    const initial = [item(), item({ id: 4, name: 'Hoodie Urbano', price: 120000 })];

    expect(cartReducer(initial, { type: 'remove', id: 4 })).toEqual([item()]);
    expect(cartReducer(initial, { type: 'clear' })).toEqual([]);
  });

  it('hidrata el carrito saneando datos corruptos', () => {
    const result = cartReducer([], {
      type: 'hydrate',
      items: [
        item({ qty: 500 }),
        { id: 1, name: 'Duplicado', price: 1, qty: 1, color: '#fff' },
        { id: 'x', name: 'Inválido', price: 10, qty: 1, color: '#fff' }
      ] as unknown as CartItem[]
    });

    expect(result).toHaveLength(1);
    expect(result[0].qty).toBe(MAX_QTY);
  });
});

describe('cartTotals', () => {
  it('calcula subtotal, IVA del 19% y total', () => {
    const totals = cartTotals([
      item({ qty: 3 }),
      item({ id: 4, name: 'Hoodie Urbano', price: 120000, qty: 1 })
    ]);

    expect(totals).toEqual({ subtotal: 255000, iva: 48450, total: 303450 });
  });

  it('devuelve ceros con el carrito vacío', () => {
    expect(cartTotals([])).toEqual({ subtotal: 0, iva: 0, total: 0 });
  });

  it('cuenta unidades totales, no líneas', () => {
    expect(cartCount([item({ qty: 2 }), item({ id: 2, qty: 3 })])).toBe(5);
  });
});

describe('sanitizeCart', () => {
  it('descarta valores que no son arreglos', () => {
    expect(sanitizeCart(null)).toEqual([]);
    expect(sanitizeCart({})).toEqual([]);
    expect(sanitizeCart('texto')).toEqual([]);
  });

  it('normaliza cantidades y descarta precios inválidos', () => {
    const result = sanitizeCart([
      { id: 2, name: 'Oversize', price: 55000, qty: 0, color: '#eee' },
      { id: 3, name: 'Lino', price: -1, qty: 2, color: '#eee' },
      { id: 4, name: 'Hoodie', price: 120000, qty: 12, color: '#eee' }
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 2, qty: 1 });
    expect(result[1]).toMatchObject({ id: 4, qty: 12 });
  });
});
