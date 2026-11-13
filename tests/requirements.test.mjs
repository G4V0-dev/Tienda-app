import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startStack } from './harness.mjs';

let stack;
let base;
let token;
let userId;
let order;
let orderItems;

const card = {
  name: 'Cliente de Prueba',
  number: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123'
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30000)
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());

  return { response, data, contentType };
}

async function rawRequest(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30000)
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());

  return { response, data, contentType };
}

function isPdf(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 4).toString() === '%PDF';
}

before(async () => {
  stack = await startStack();
  base = stack.baseUrl;
});

after(async () => {
  await stack?.stop();
});

describe('Catálogo y autenticación', () => {
  it('expone un catálogo de 6 productos con precios válidos', async () => {
    const { response, data } = await request('/api/products');

    assert.equal(response.status, 200);
    assert.equal(data.length, 6);
    for (const product of data) {
      assert.equal(typeof product.id, 'number');
      assert.ok(product.name);
      assert.ok(Number.isInteger(product.price) && product.price > 0);
    }
  });

  it('registra un usuario, devuelve JWT y permite consultar /me', async () => {
    const email = `carrito-${Date.now()}@example.com`;
    const { response, data } = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Cliente Carrito', email, password: 'secreto123' }
    });

    assert.equal(response.status, 201);
    assert.ok(data.token);
    assert.equal(data.user.email, email);

    token = data.token;
    userId = data.user.id;

    const me = await request('/api/auth/me', { token });
    assert.equal(me.response.status, 200);
    assert.equal(me.data.user.id, userId);
  });

  it('rechaza correos duplicados y contraseñas cortas', async () => {
    const email = `duplicado-${Date.now()}@example.com`;

    const first = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Duplicado', email, password: 'secreto123' }
    });
    assert.equal(first.response.status, 201);

    const duplicate = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Duplicado', email, password: 'secreto123' }
    });
    assert.equal(duplicate.response.status, 409);

    const short = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Corto', email: `corto-${Date.now()}@example.com`, password: '123' }
    });
    assert.equal(short.response.status, 400);
  });

  it('rechaza credenciales inválidas y peticiones sin token', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nadie@example.com', password: 'incorrecta' }
    });
    assert.equal(login.response.status, 401);

    const me = await request('/api/auth/me');
    assert.equal(me.response.status, 401);
  });
});

describe('Gestión de carrito en el checkout', () => {
  it('exige autenticación para pagar', async () => {
    const { response } = await request('/api/checkout', {
      method: 'POST',
      body: { items: [{ id: 1, qty: 1 }], card }
    });
    assert.equal(response.status, 401);
  });

  it('rechaza un carrito vacío o sin productos válidos', async () => {
    const empty = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [], card }
    });
    assert.equal(empty.response.status, 400);
    assert.match(empty.data.error, /carrito está vacío/i);

    const invalid = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [{ id: 9999, qty: 1 }], card }
    });
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.data.error, /productos válidos/i);
  });

  it('valida los datos de la tarjeta ficticia', async () => {
    const cases = [
      { card: { ...card, number: '123' }, error: /tarjeta/i },
      { card: { ...card, name: '   ' }, error: /nombre/i },
      { card: { ...card, expiry: '13-2030' }, error: /MM\/AA/i },
      { card: { ...card, cvv: '12' }, error: /CVV/i }
    ];

    for (const testCase of cases) {
      const { response, data } = await request('/api/checkout', {
        method: 'POST',
        token,
        body: { items: [{ id: 1, qty: 1 }], card: testCase.card }
      });

      assert.equal(response.status, 400);
      assert.match(data.error, testCase.error);
    }
  });

  it('acumula cantidades y calcula subtotal, IVA 19% y total con el microservicio', async () => {
    const { response, data } = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [{ id: 1, qty: 3 }, { id: 4, qty: 1 }], card }
    });

    assert.equal(response.status, 201);
    assert.equal(data.iva_fallback, false);

    order = data.order;
    orderItems = data.items;

    assert.equal(order.subtotal, 255000);
    assert.equal(order.iva, 48450);
    assert.equal(order.total, 303450);
    assert.equal(order.status, 'aprobado');
    assert.equal(order.card_last4, '4242');
    assert.match(order.transaction_id, /^TX-/);

    const shirt = data.items.find((item) => item.product_id === 1);
    assert.equal(shirt.qty, 3);
    assert.equal(shirt.line_total, 135000);
  });

  it('recalcula precios en el servidor e ignora el precio enviado por el cliente', async () => {
    const { response, data } = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [{ id: 6, qty: 2, price: 1 }], card }
    });

    assert.equal(response.status, 201);
    assert.equal(data.order.subtotal, 78000);
    assert.equal(data.items[0].price, 39000);
  });

  it('normaliza cantidades fuera de rango al límite de 1 a 99', async () => {
    const low = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [{ id: 2, qty: 0 }], card }
    });
    assert.equal(low.response.status, 201);
    assert.equal(low.data.order.subtotal, 55000);

    const high = await request('/api/checkout', {
      method: 'POST',
      token,
      body: { items: [{ id: 6, qty: 150 }], card }
    });
    assert.equal(high.response.status, 201);
    assert.equal(high.data.order.subtotal, 99 * 39000);
  });

  it('persiste la orden y solo la expone a su dueño', async () => {
    const own = await request(`/api/orders/${order.id}`, { token });
    assert.equal(own.response.status, 200);
    assert.equal(own.data.order.id, order.id);
    assert.equal(own.data.items.length, orderItems.length);

    const otherEmail = `otro-${Date.now()}@example.com`;
    const other = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Otro Cliente', email: otherEmail, password: 'secreto123' }
    });

    const foreign = await request(`/api/orders/${order.id}`, {
      token: other.data.token
    });
    assert.equal(foreign.response.status, 404);
  });
});

describe('Factura/comprobante PDF', () => {
  it('descarga un PDF válido para la orden del usuario', async () => {
    const { response, data, contentType } = await request(`/api/orders/${order.id}/receipt`, {
      token
    });

    assert.equal(response.status, 200);
    assert.match(contentType, /application\/pdf/);
    assert.match(
      response.headers.get('content-disposition') || '',
      /attachment; filename="comprobante-[a-f0-9]{8}\.pdf"/
    );
    assert.ok(isPdf(data), 'El cuerpo no empieza con %PDF');
    assert.ok(data.length > 1000, `PDF demasiado pequeño: ${data.length} bytes`);
  });

  it('protege el comprobante con autenticación y propiedad de la orden', async () => {
    const anonymous = await request(`/api/orders/${order.id}/receipt`);
    assert.equal(anonymous.response.status, 401);

    const otherEmail = `pdf-otro-${Date.now()}@example.com`;
    const other = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Otro PDF', email: otherEmail, password: 'secreto123' }
    });

    const foreign = await request(`/api/orders/${order.id}/receipt`, {
      token: other.data.token
    });
    assert.equal(foreign.response.status, 404);
  });

  it('responde 404 si la orden no existe', async () => {
    const { response } = await request('/api/orders/no-existe/receipt', { token });
    assert.equal(response.status, 404);
  });
});

describe('Microservicio de IVA', () => {
  it('calcula 19% y total', async () => {
    const { response, data } = await rawRequest(`${stack.ivaUrl}/calcular`, {
      method: 'POST',
      body: { subtotal: 100000 }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(data, { subtotal: 100000, tasa: 0.19, iva: 19000, total: 119000 });
  });

  it('acepta subtotal cero y rechaza valores inválidos', async () => {
    const zero = await rawRequest(`${stack.ivaUrl}/calcular`, {
      method: 'POST',
      body: { subtotal: 0 }
    });
    assert.equal(zero.response.status, 200);
    assert.equal(zero.data.iva, 0);

    for (const value of ['abc', -1, null, undefined, '']) {
      const invalid = await rawRequest(`${stack.ivaUrl}/calcular`, {
        method: 'POST',
        body: { subtotal: value }
      });
      assert.equal(invalid.response.status, 400);
    }
  });
});

describe('Microservicio de PDF', () => {
  const sampleOrder = {
    id: 'abcdef12-3456-7890-abcd-ef1234567890',
    subtotal: 90000,
    iva: 17100,
    total: 107100,
    status: 'aprobado',
    card_last4: '4242',
    transaction_id: 'TX-PRUEBA-0001',
    created_at: new Date().toISOString()
  };
  const sampleItems = [
    { name: 'Camiseta Clásica', price: 45000, qty: 2 }
  ];

  it('genera un PDF con cabecera y nombre de archivo', async () => {
    const { response, data, contentType } = await rawRequest(`${stack.pdfUrl}/comprobante`, {
      method: 'POST',
      body: { order: sampleOrder, items: sampleItems, customer: { name: 'Ana', email: 'ana@example.com' } }
    });

    assert.equal(response.status, 200);
    assert.match(contentType, /application\/pdf/);
    assert.match(
      response.headers.get('content-disposition') || '',
      /comprobante-abcdef12\.pdf/
    );
    assert.ok(isPdf(data));
    assert.ok(data.length > 1000);
  });

  it('rechaza payloads incompletos', async () => {
    const missing = await rawRequest(`${stack.pdfUrl}/comprobante`, {
      method: 'POST',
      body: { order: sampleOrder, items: [] }
    });
    assert.equal(missing.response.status, 400);

    const noOrder = await rawRequest(`${stack.pdfUrl}/comprobante`, {
      method: 'POST',
      body: { items: sampleItems }
    });
    assert.equal(noOrder.response.status, 400);
  });
});
