import type { CardInput } from '@/types';

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function formatCvv(value: string): string {
  return onlyDigits(value).slice(0, 4);
}

export function validateCard(card: CardInput): string | null {
  const number = onlyDigits(card.number);

  if (number.length < 15 || number.length > 16) {
    return 'Escribe un número de tarjeta ficticio de 15 o 16 dígitos.';
  }
  if (!card.name.trim()) {
    return 'Escribe el nombre que aparece en la tarjeta.';
  }
  if (!/^\d{2}\/\d{2}$/.test(card.expiry.trim())) {
    return 'La fecha debe tener formato MM/AA.';
  }
  if (!/^\d{3,4}$/.test(card.cvv.trim())) {
    return 'El CVV debe tener 3 o 4 dígitos.';
  }

  return null;
}

export const DEMO_CARD: CardInput = {
  name: 'Cliente Demo',
  number: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123'
};
