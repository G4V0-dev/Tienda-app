import fs from 'node:fs';

const base = (process.env.BASE_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');

function fail(message) {
  console.error(`[smoke] FAIL: ${message}`);
  process.exit(1);
}

if (!/^https?:\/\//i.test(base)) {
  fail(`BASE_URL inválida: ${base}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(60000)
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    fail(`${path} -> ${response.status} ${data?.error || text.slice(0, 120)}`);
  }

  return { response, data };
}

console.log(`[smoke] Base URL: ${base}`);

const health = await request('/api/health');
console.log(`[smoke] health: ${health.data.database}`);

const products = (await request('/api/products')).data;
if (!Array.isArray(products) || products.length !== 6) {
  fail('El catálogo no tiene 6 productos');
}

const email = `smoke${Date.now()}@example.com`;
const password = '123456';

await request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name: 'Smoke Test', email, password })
});

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

if (!login.data.token) fail('El login no devolvió token');

const auth = { Authorization: `Bearer ${login.data.token}` };

const checkout = await request('/api/checkout', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    items: [{ id: 1, qty: 3 }, { id: 4, qty: 1 }],
    card: { name: 'Smoke Test', number: '4242 4242 4242 4242', expiry: '12/30', cvv: '123' }
  })
});

const order = checkout.data.order;
const items = checkout.data.items;

if (checkout.data.iva_fallback) fail('El IVA se calculó localmente; ms-iva no respondió');
if (order.subtotal !== 255000) fail(`Subtotal esperado 255000, recibido ${order.subtotal}`);
if (order.iva !== 48450) fail(`IVA esperado 48450, recibido ${order.iva}`);
if (order.total !== 303450) fail(`Total esperado 303450, recibido ${order.total}`);

const shirt = items.find((item) => item.product_id === 1);
if (!shirt || shirt.qty !== 3) fail('El carrito no conservó las 3 unidades');

const receipt = await fetch(`${base}/api/orders/${order.id}/receipt`, {
  headers: auth,
  signal: AbortSignal.timeout(60000)
});

if (!receipt.ok) fail(`Comprobante -> ${receipt.status}`);
if (!String(receipt.headers.get('content-type')).includes('application/pdf')) {
  fail('El comprobante no es PDF');
}

const pdf = Buffer.from(await receipt.arrayBuffer());
if (pdf.subarray(0, 4).toString() !== '%PDF') fail('El archivo no tiene firma PDF');
if (pdf.length < 1000) fail('El PDF es demasiado pequeño');

if (process.env.SAVE_PDF === '1') {
  fs.writeFileSync('comprobante-smoke.pdf', pdf);
  console.log('[smoke] PDF guardado en comprobante-smoke.pdf');
}

console.log(`[smoke] usuario: ${email}`);
console.log(`[smoke] orden: ${order.id}`);
console.log(`[smoke] subtotal: ${order.subtotal}, IVA: ${order.iva}, total: ${order.total}`);
console.log(`[smoke] PDF: ${pdf.length} bytes`);
console.log('[smoke] OK');
