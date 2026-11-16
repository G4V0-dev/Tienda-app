import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startStack } from './harness.mjs';

const ADMIN_EMAIL = 'Admin@Test.local';

const card = {
  name: 'Cliente de Prueba',
  number: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123'
};

let stack;
let base;
let adminToken;
let userToken;

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30000)
  });

  const text = await response.text();
  return {
    response,
    data: text ? JSON.parse(text) : null
  };
}

async function register(name, email, password = 'secreto123', extra = {}) {
  return request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, ...extra }
  });
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

before(async () => {
  stack = await startStack({ ADMIN_EMAILS: ADMIN_EMAIL });
  base = stack.baseUrl;
});

after(async () => {
  await stack?.stop();
});

describe('Roles y autorización', () => {
  it('crea usuarios normales y nunca acepta un rol enviado por el cliente', async () => {
    const email = uniqueEmail('normal');
    const { response, data } = await register('Cliente Normal', email, 'secreto123', {
      role: 'admin'
    });

    assert.equal(response.status, 201);
    assert.equal(data.user.role, 'user');

    userToken = data.token;

    const me = await request('/api/auth/me', { token: userToken });
    assert.equal(me.response.status, 200);
    assert.equal(me.data.user.role, 'user');
  });

  it('promueve a administrador si el correo está en ADMIN_EMAILS sin distinguir mayúsculas', async () => {
    const { response, data } = await register(
      'Administradora',
      'admin@test.local'
    );

    assert.equal(response.status, 201);
    assert.equal(data.user.role, 'admin');

    adminToken = data.token;

    const me = await request('/api/auth/me', { token: adminToken });
    assert.equal(me.data.user.role, 'admin');
  });

  it('protege las rutas de administración', async () => {
    const anonymous = await request('/api/admin/products');
    assert.equal(anonymous.response.status, 401);

    const normal = await request('/api/admin/products', { token: userToken });
    assert.equal(normal.response.status, 403);
    assert.match(normal.data.error, /administrador/i);
  });
});

describe('Catálogo administrable', () => {
  let product;

  it('el administrador ve los seis productos sembrados con stock', async () => {
    const { response, data } = await request('/api/admin/products', {
      token: adminToken
    });

    assert.equal(response.status, 200);
    assert.equal(data.length, 6);
    assert.ok(data.every((item) => item.stock === 500));
    assert.ok(data.every((item) => item.active === 1));
  });

  it('crea un producto y lo publica en el catálogo', async () => {
    const created = await request('/api/admin/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Bufanda de Lana',
        description: 'Tejido suave, unisex.',
        price: 30000,
        color: '#aabbcc',
        stock: 3
      }
    });

    assert.equal(created.response.status, 201);
    product = created.data;

    assert.equal(product.id, 7);
    assert.equal(product.name, 'Bufanda de Lana');
    assert.equal(product.stock, 3);
    assert.equal(product.active, 1);

    const catalog = await request('/api/products');
    assert.equal(catalog.data.length, 7);
    assert.deepEqual(catalog.data.at(-1), {
      id: 7,
      name: 'Bufanda de Lana',
      description: 'Tejido suave, unisex.',
      price: 30000,
      color: '#aabbcc',
      stock: 3
    });
  });

  it('rechaza datos inválidos sin crear productos', async () => {
    const cases = [
      { name: '', price: 1000, stock: 1 },
      { name: 'Sin precio', stock: 1 },
      { name: 'Precio negativo', price: -1, stock: 1 },
      { name: 'Stock negativo', price: 1000, stock: -1 },
      { name: 'Color inválido', price: 1000, stock: 1, color: 'rojo' }
    ];

    for (const body of cases) {
      const { response } = await request('/api/admin/products', {
        method: 'POST',
        token: adminToken,
        body
      });
      assert.equal(response.status, 400, JSON.stringify(body));
    }

    const list = await request('/api/admin/products', { token: adminToken });
    assert.equal(list.data.length, 7);
  });

  it('actualiza nombre, precio y stock conservando el resto de campos', async () => {
    const updated = await request(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { name: 'Bufanda Premium', price: 35000, stock: 8 }
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.data.name, 'Bufanda Premium');
    assert.equal(updated.data.price, 35000);
    assert.equal(updated.data.stock, 8);
    assert.equal(updated.data.description, 'Tejido suave, unisex.');
    assert.equal(updated.data.color, '#aabbcc');
    assert.equal(updated.data.active, 1);

    const unknown = await request('/api/admin/products/9999', {
      method: 'PUT',
      token: adminToken,
      body: { stock: 1 }
    });
    assert.equal(unknown.response.status, 404);
  });

  it('elimina de forma lógica y permite reactivar', async () => {
    const deleted = await request(`/api/admin/products/${product.id}`, {
      method: 'DELETE',
      token: adminToken
    });

    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.data.active, 0);

    const catalog = await request('/api/products');
    assert.equal(catalog.data.length, 6);

    const adminList = await request('/api/admin/products', { token: adminToken });
    const inactive = adminList.data.find((item) => item.id === product.id);
    assert.equal(inactive.active, 0);

    const reactivated = await request(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { active: 1 }
    });

    assert.equal(reactivated.response.status, 200);
    assert.equal(reactivated.data.active, 1);

    const catalogAgain = await request('/api/products');
    assert.equal(catalogAgain.data.length, 7);
  });

  it('impide que un usuario normal modifique productos', async () => {
    const create = await request('/api/admin/products', {
      method: 'POST',
      token: userToken,
      body: { name: 'Intruso', price: 1000, stock: 1 }
    });
    assert.equal(create.response.status, 403);

    const update = await request(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      token: userToken,
      body: { price: 1 }
    });
    assert.equal(update.response.status, 403);

    const remove = await request(`/api/admin/products/${product.id}`, {
      method: 'DELETE',
      token: userToken
    });
    assert.equal(remove.response.status, 403);
  });
});

describe('Stock en el checkout', () => {
  let product;

  it('prepara un producto con stock limitado', async () => {
    const { response, data } = await request('/api/admin/products', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Gorra Limitada', price: 20000, stock: 3 }
    });

    assert.equal(response.status, 201);
    product = data;
  });

  it('rechaza una cantidad mayor al stock disponible', async () => {
    const { response, data } = await request('/api/checkout', {
      method: 'POST',
      token: userToken,
      body: { items: [{ id: product.id, qty: 4 }], card }
    });

    assert.equal(response.status, 409);
    assert.match(data.error, /Stock insuficiente/i);

    const catalog = await request('/api/products');
    assert.equal(catalog.data.find((item) => item.id === product.id).stock, 3);
  });

  it('descuenta el stock al confirmar el pago', async () => {
    const first = await request('/api/checkout', {
      method: 'POST',
      token: userToken,
      body: { items: [{ id: product.id, qty: 2 }], card }
    });

    assert.equal(first.response.status, 201);
    assert.equal(first.data.order.total, 47600);

    const catalog = await request('/api/products');
    assert.equal(catalog.data.find((item) => item.id === product.id).stock, 1);
  });

  it('bloquea la compra cuando el stock llega a cero', async () => {
    const last = await request('/api/checkout', {
      method: 'POST',
      token: userToken,
      body: { items: [{ id: product.id, qty: 1 }], card }
    });
    assert.equal(last.response.status, 201);

    const soldOut = await request('/api/checkout', {
      method: 'POST',
      token: userToken,
      body: { items: [{ id: product.id, qty: 1 }], card }
    });
    assert.equal(soldOut.response.status, 409);

    const catalog = await request('/api/products');
    const row = catalog.data.find((item) => item.id === product.id);
    assert.equal(row.stock, 0);
  });
});
