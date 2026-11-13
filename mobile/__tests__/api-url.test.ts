import { resolveApiUrl } from '@/lib/api';

describe('resolveApiUrl', () => {
  it('prioriza la URL configurada y quita barras finales', () => {
    expect(resolveApiUrl('https://api.tienda.com/', '192.168.1.5:8081', 'ios')).toBe(
      'https://api.tienda.com'
    );
  });

  it('usa la IP de Metro para que Expo Go llegue al backend local', () => {
    expect(resolveApiUrl(undefined, '192.168.1.42:8081', 'ios')).toBe(
      'http://192.168.1.42:3000'
    );
  });

  it('cae a 10.0.2.2 en el emulador de Android', () => {
    expect(resolveApiUrl(undefined, undefined, 'android')).toBe(
      'http://10.0.2.2:3000'
    );
  });

  it('cae a localhost en iOS y web', () => {
    expect(resolveApiUrl(undefined, undefined, 'ios')).toBe('http://localhost:3000');
    expect(resolveApiUrl(undefined, undefined, 'web')).toBe('http://localhost:3000');
  });
});
