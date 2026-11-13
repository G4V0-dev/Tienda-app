import { fireEvent, render, screen } from '@testing-library/react-native';

import { CartLine } from '@/components/CartLine';
import { ProductCard } from '@/components/ProductCard';
import { TotalsCard } from '@/components/TotalsCard';
import type { CartItem, Product } from '@/types';

const product: Product = {
  id: 1,
  name: 'Camiseta Clásica',
  description: 'Algodón 100%, corte regular.',
  price: 45000,
  color: '#dbe4ee'
};

const cartItem: CartItem = {
  id: 1,
  name: 'Camiseta Clásica',
  price: 45000,
  qty: 2,
  color: '#dbe4ee'
};

describe('ProductCard', () => {
  it('muestra nombre, descripción y precio', () => {
    render(<ProductCard product={product} onAdd={jest.fn()} />);

    expect(screen.getByText('Camiseta Clásica')).toBeTruthy();
    expect(screen.getByText('Algodón 100%, corte regular.')).toBeTruthy();
    expect(screen.getByText('$ 45.000')).toBeTruthy();
  });

  it('notifica el producto al presionar agregar', () => {
    const onAdd = jest.fn();
    render(<ProductCard product={product} onAdd={onAdd} />);

    fireEvent.press(screen.getByTestId('product-add-1'));

    expect(onAdd).toHaveBeenCalledWith(product);
  });
});

describe('CartLine', () => {
  it('muestra cantidad y total de la línea', () => {
    render(
      <CartLine
        item={cartItem}
        onIncrement={jest.fn()}
        onDecrement={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.getByTestId('cart-qty-1')).toHaveTextContent('2');
    expect(screen.getByText('$ 90.000')).toBeTruthy();
  });

  it('dispara incrementar, decrementar y quitar', () => {
    const onIncrement = jest.fn();
    const onDecrement = jest.fn();
    const onRemove = jest.fn();

    render(
      <CartLine
        item={cartItem}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onRemove={onRemove}
      />
    );

    fireEvent.press(screen.getByTestId('cart-inc-1'));
    fireEvent.press(screen.getByTestId('cart-dec-1'));
    fireEvent.press(screen.getByTestId('cart-remove-1'));

    expect(onIncrement).toHaveBeenCalledWith(1);
    expect(onDecrement).toHaveBeenCalledWith(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});

describe('TotalsCard', () => {
  it('muestra subtotal, IVA y total', () => {
    render(<TotalsCard totals={{ subtotal: 255000, iva: 48450, total: 303450 }} />);

    expect(screen.getByTestId('total-subtotal')).toHaveTextContent('$ 255.000');
    expect(screen.getByTestId('total-iva')).toHaveTextContent('$ 48.450');
    expect(screen.getByTestId('total-final')).toHaveTextContent('$ 303.450');
  });
});
