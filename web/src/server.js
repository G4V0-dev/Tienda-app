require('dotenv').config();

const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { init, read, write, randomUUID, cloudState } = require('./db');
const swaggerUi = require('swagger-ui-express');
const openapi = require('../openapi');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function serviceUrl(value, fallback) {
  if (!value) return fallback;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const IVA_URL = serviceUrl(process.env.IVA_URL, 'http://localhost:4001');
const PDF_URL = serviceUrl(process.env.PDF_URL, 'http://localhost:4002');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function roleForEmail(email) {
  return ADMIN_EMAILS.has(String(email).trim().toLowerCase()) ? 'admin' : 'user';
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

async function admin(req, res, next) {
  try {
    const rows = await read('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Requiere rol de administrador' });
    }
    req.user.role = 'admin';
    next();
  } catch (error) {
    next(error);
  }
}

function parseProductInput(body = {}, existing = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const name = input.name === undefined ? existing.name : String(input.name).trim();
  const description =
    input.description === undefined
      ? existing.description || ''
      : String(input.description).trim();
  const price = input.price === undefined ? existing.price : Number(input.price);
  const color =
    input.color === undefined ? existing.color || '#dbe4ee' : String(input.color).trim();
  const stock = input.stock === undefined ? existing.stock ?? 0 : Number(input.stock);
  const active = input.active === undefined ? existing.active ?? 1 : Number(input.active);

  if (!name || name.length > 80) {
    return { error: 'El nombre es obligatorio y admite máximo 80 caracteres' };
  }
  if (!Number.isInteger(price) || price < 0 || price > 100000000) {
    return { error: 'El precio debe ser un entero entre 0 y 100000000' };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: 'El color debe tener formato hexadecimal #RRGGBB' };
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
    return { error: 'El stock debe ser un entero entre 0 y 9999' };
  }
  if (![0, 1].includes(active)) {
    return { error: 'El estado debe ser 0 (inactivo) o 1 (activo)' };
  }
  if (description.length > 240) {
    return { error: 'La descripción admite máximo 240 caracteres' };
  }

  return { value: { name, description, price, color, stock, active } };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'tienda-web',
    database: cloudState() ? 'supabase' : 'sqlite',
    iva: IVA_URL,
    pdf: PDF_URL
  });
});

app.get('/api/products', route(async (req, res) => {
  const rows = await read(
    `SELECT id, name, description, price, color, stock
     FROM products WHERE active = 1 ORDER BY id`
  );
  res.json(rows);
}));

app.post('/api/auth/register', route(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await read('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.length) {
    return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    password_hash: await bcrypt.hash(String(password), 10),
    role: roleForEmail(normalizedEmail),
    created_at: new Date().toISOString()
  };

  await write(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
    [user.id, user.name, user.email, user.password_hash, user.role, user.created_at]
  );

  res.status(201).json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}));

app.post('/api/auth/login', route(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  const rows = await read('SELECT * FROM users WHERE email = $1', [
    String(email).trim().toLowerCase()
  ]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }
  });
}));

app.get('/api/auth/me', auth, route(async (req, res) => {
  const rows = await read('SELECT id, name, email, role FROM users WHERE id = $1', [
    req.user.id
  ]);

  if (!rows.length) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  res.json({ user: rows[0] });
}));

app.get('/api/admin/products', auth, admin, route(async (req, res) => {
  const rows = await read('SELECT * FROM products ORDER BY id');
  res.json(rows);
}));

app.post('/api/admin/products', auth, admin, route(async (req, res) => {
  const parsed = parseProductInput(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const rows = await read('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM products');
  const id = Number(rows[0].next_id);
  const now = new Date().toISOString();
  const { name, description, price, color, stock } = parsed.value;

  await write(
    `INSERT INTO products
       (id, name, description, price, color, stock, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $7)`,
    [id, name, description, price, color, stock, now]
  );

  const created = await read('SELECT * FROM products WHERE id = $1', [id]);
  res.status(201).json(created[0]);
}));

app.put('/api/admin/products/:id', auth, admin, route(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de producto inválido' });
  }

  const rows = await read('SELECT * FROM products WHERE id = $1', [id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const parsed = parseProductInput(req.body, rows[0]);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { name, description, price, color, stock, active } = parsed.value;
  const now = new Date().toISOString();

  await write(
    `UPDATE products
     SET name = $1, description = $2, price = $3, color = $4, stock = $5,
         active = $6, updated_at = $7
     WHERE id = $8`,
    [name, description, price, color, stock, active, now, id]
  );

  const updated = await read('SELECT * FROM products WHERE id = $1', [id]);
  res.json(updated[0]);
}));

app.delete('/api/admin/products/:id', auth, admin, route(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de producto inválido' });
  }

  const rows = await read('SELECT * FROM products WHERE id = $1', [id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const now = new Date().toISOString();
  await write('UPDATE products SET active = 0, updated_at = $1 WHERE id = $2', [now, id]);
  res.json({ ...rows[0], active: 0, updated_at: now });
}));

app.post('/api/checkout', auth, route(async (req, res) => {
  const { items, card } = req.body || {};

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const rows = await read('SELECT * FROM products WHERE id = $1 AND active = 1', [
      Number(item.id)
    ]);
    const product = rows[0];
    if (!product) continue;
    const qty = Math.min(99, Math.max(1, Number.parseInt(item.qty, 10) || 1));
    subtotal += product.price * qty;
    normalizedItems.push({ product, qty });
  }

  if (!normalizedItems.length) {
    return res.status(400).json({ error: 'No hay productos válidos en el carrito' });
  }

  for (const item of normalizedItems) {
    if (item.qty > item.product.stock) {
      return res.status(409).json({
        error: `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`
      });
    }
  }

  const cardNumber = String(card?.number || '').replace(/\D/g, '');
  const cardName = String(card?.name || '').trim();
  const expiry = String(card?.expiry || '').trim();
  const cvv = String(card?.cvv || '').trim();

  if (cardNumber.length < 15 || cardNumber.length > 16) {
    return res.status(400).json({ error: 'Número de tarjeta ficticio inválido' });
  }
  if (!cardName) {
    return res.status(400).json({ error: 'Escribe el nombre de la tarjeta' });
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ error: 'La fecha debe tener formato MM/AA' });
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ error: 'El CVV debe tener 3 o 4 dígitos' });
  }

  let taxes;
  let ivaFallback = false;

  try {
    const response = await fetch(`${IVA_URL}/calcular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Servicio de IVA no disponible');
    taxes = await response.json();
  } catch (error) {
    ivaFallback = true;
    const iva = Math.round(subtotal * 0.19);
    taxes = { subtotal, iva, total: subtotal + iva, tasa: 0.19 };
    console.warn('[web] IVA calculado localmente:', error.message);
  }

  const iva = Number(taxes.iva);
  const total = subtotal + iva;
  const orderId = randomUUID();
  const createdAt = new Date().toISOString();

  const decremented = [];
  try {
    for (const item of normalizedItems) {
      const result = await write(
        `UPDATE products
         SET stock = stock - $1, updated_at = $2
         WHERE id = $3 AND stock >= $1`,
        [item.qty, createdAt, item.product.id]
      );
      if (!result.changes) {
        throw Object.assign(new Error('Stock insuficiente'), { statusCode: 409 });
      }
      decremented.push(item);
    }
  } catch (error) {
    for (const item of decremented) {
      await write('UPDATE products SET stock = stock + $1 WHERE id = $2', [
        item.qty,
        item.product.id
      ]);
    }
    if (error.statusCode === 409) {
      return res.status(409).json({
        error: 'El stock cambió durante el pago. Revisa el carrito e intenta de nuevo.'
      });
    }
    throw error;
  }

  const order = {
    id: orderId,
    user_id: req.user.id,
    subtotal,
    iva,
    total,
    status: 'aprobado',
    card_last4: cardNumber.slice(-4),
    transaction_id: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    created_at: createdAt
  };

  await write(
    `INSERT INTO orders (id, user_id, subtotal, iva, total, status, card_last4, transaction_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
    [
      order.id,
      order.user_id,
      order.subtotal,
      order.iva,
      order.total,
      order.status,
      order.card_last4,
      order.transaction_id,
      order.created_at
    ]
  );

  for (const item of normalizedItems) {
    await write(
      `INSERT INTO order_items (id, order_id, product_id, name, price, qty)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        order.id,
        item.product.id,
        item.product.name,
        item.product.price,
        item.qty
      ]
    );
  }

  res.status(201).json({
    order,
    items: normalizedItems.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      qty: item.qty,
      line_total: item.product.price * item.qty
    })),
    customer: { name: req.user.name, email: req.user.email },
    iva_fallback: ivaFallback
  });
}));

app.get('/api/orders/:id', auth, route(async (req, res) => {
  const orders = await read('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id
  ]);

  if (!orders.length) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  const items = await read('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  res.json({ order: orders[0], items });
}));

app.get('/api/orders/:id/receipt', auth, route(async (req, res) => {
  const orders = await read('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id
  ]);

  if (!orders.length) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  const order = orders[0];
  const items = await read('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

  try {
    const response = await fetch(`${PDF_URL}/comprobante`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        items: items.map((item) => ({
          name: item.name,
          price: item.price,
          qty: item.qty
        })),
        customer: { name: req.user.name, email: req.user.email }
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error('El servicio de PDF respondió con error');

    const pdf = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comprobante-${order.id.slice(0, 8)}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    console.warn('[web] No se pudo generar el PDF:', error.message);
    res.status(502).json({ error: 'No se pudo generar el comprobante PDF' });
  }
}));

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, { customSiteTitle: 'Tienda Web API' })
);
app.get('/openapi.json', (req, res) => {
  res.json(openapi);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('[web] Error:', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[web] Escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[web] No se pudo iniciar:', error);
    process.exit(1);
  });
