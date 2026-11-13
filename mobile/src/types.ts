export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  color: string;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
  color: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Order = {
  id: string;
  user_id: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  card_last4: string;
  transaction_id: string;
  created_at: string;
};

export type OrderLine = {
  product_id: number;
  name: string;
  price: number;
  qty: number;
  line_total: number;
};

export type CheckoutResponse = {
  order: Order;
  items: OrderLine[];
  customer: { name: string; email: string };
  iva_fallback: boolean;
};

export type CardInput = {
  name: string;
  number: string;
  expiry: string;
  cvv: string;
};

export type Totals = {
  subtotal: number;
  iva: number;
  total: number;
};
