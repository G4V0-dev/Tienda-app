import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { CartProvider, useCart } from '@/contexts/CartContext';
import { money } from '@/lib/money';
import type { Product } from '@/types';

const CART_KEY = 'tienda.cart.v1';

const product: Product = {
  id: 1,
  name: 'Camiseta Clásica',
  description: 'Algodón 100%',
  price: 45000,
  color: '#dbe4ee'
};

function Probe() {
  const { hydrated, count, totals, items, add } = useCart();

  return (
    <View>
      <Text testID="hydrated">{String(hydrated)}</Text>
      <Text testID="count">{count}</Text>
      <Text testID="total">{money(totals.total)}</Text>
      <Text testID="items">{items.map((item) => item.name).join(',')}</Text>
      <Pressable testID="add" onPress={() => add(product)}>
        <Text>Agregar</Text>
      </Pressable>
    </View>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CartProvider', () => {
  it('guarda el carrito en AsyncStorage al agregar un producto', async () => {
    render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('hydrated')).toHaveTextContent('true')
    );

    fireEvent.press(screen.getByTestId('add'));

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem(CART_KEY);
      expect(JSON.parse(stored || '[]')).toHaveLength(1);
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('$ 53.550');
  });

  it('restaura el carrito persistido al iniciar', async () => {
    await AsyncStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { id: 1, name: 'Camiseta Clásica', price: 45000, qty: 3, color: '#dbe4ee' }
      ])
    );

    render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('3')
    );

    expect(screen.getByTestId('items')).toHaveTextContent('Camiseta Clásica');
    expect(screen.getByTestId('total')).toHaveTextContent('$ 160.650');
  });

  it('ignora un carrito corrupto sin romper la app', async () => {
    await AsyncStorage.setItem(CART_KEY, '{no-es-json');

    render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('hydrated')).toHaveTextContent('true')
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
