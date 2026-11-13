import { dateLabel, money, shortId } from '@/lib/money';
import {
  DEMO_CARD,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  onlyDigits,
  validateCard
} from '@/lib/validation';

describe('money', () => {
  it('formatea pesos colombianos con separador de miles', () => {
    expect(money(45000)).toBe('$ 45.000');
    expect(money(303450)).toBe('$ 303.450');
    expect(money('119000')).toBe('$ 119.000');
  });

  it('redondea y maneja valores inválidos', () => {
    expect(money(1099.6)).toBe('$ 1.100');
    expect(money(Number.NaN)).toBe('$ 0');
    expect(money(0)).toBe('$ 0');
  });

  it('acorta identificadores y formatea fechas', () => {
    expect(shortId('abcdef12-3456')).toBe('ABCDEF12');
    expect(shortId('')).toBe('');
    expect(dateLabel('no-es-fecha')).toBe('no-es-fecha');
    expect(dateLabel('2026-11-13T12:00:00.000Z')).toMatch(/2026/);
  });
});

describe('validación de tarjeta', () => {
  it('formatea número, vencimiento y CVV', () => {
    expect(onlyDigits('4242-4242 abc')).toBe('42424242');
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('42424242424242429999')).toBe('4242 4242 4242 4242');
    expect(formatExpiry('1230')).toBe('12/30');
    expect(formatExpiry('1')).toBe('1');
    expect(formatCvv('12ab34')).toBe('1234');
  });

  it('acepta la tarjeta de demostración', () => {
    expect(validateCard(DEMO_CARD)).toBeNull();
  });

  it('rechaza número, nombre, fecha y CVV inválidos', () => {
    expect(validateCard({ ...DEMO_CARD, number: '1234' })).toMatch(/15 o 16/);
    expect(validateCard({ ...DEMO_CARD, name: '   ' })).toMatch(/nombre/);
    expect(validateCard({ ...DEMO_CARD, expiry: '2030-12' })).toMatch(/MM\/AA/);
    expect(validateCard({ ...DEMO_CARD, cvv: '1' })).toMatch(/CVV/);
  });
});
