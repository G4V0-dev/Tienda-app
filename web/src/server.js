require('dotenv').config();

const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { init, read, write, randomUUID, cloudState } = require('./db');
const products = require('./products');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

function serviceUrl(value, fallback) {
  if (!value) return fallback;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const IVA_URL = serviceUrl(process.env.IVA_URL, 'http://localhost:4001');
const PDF_URL = serviceUrl(process.env.PDF_URL, 'http://localhost:4002');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
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

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'tienda-web',
    database: cloudState() ? 'supabase' : 'sqlite',
    iva: IVA_URL,
    pdf: PDF_URL
  });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

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
    created_at: new Date().toISOString()
  };

  await write(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [user.id, user.name, user.email, user.password_hash, user.created_at]
  );

  res.status(201).json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email }
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
    user: { id: user.id, name: user.name, email: user.email }
  });
}));

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

app.post('/api/checkout', auth, route(async (req, res) => {
  const { items, card } = req.body || {};

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = products.find((p) => p.id === Number(item.id));
    if (!product) continue;
    const qty = Math.min(99, Math.max(1, Number.parseInt(item.qty, 10) || 1));
    subtotal += product.price * qty;
    normalizedItems.push({ product, qty });
  }

  if (!normalizedItems.length) {
    return res.status(400).json({ error: 'No hay productos válidos en el carrito' });
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
