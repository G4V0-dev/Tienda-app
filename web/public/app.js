const state = {
  token: localStorage.getItem('token') || '',
  user: readStored('user', null),
  products: [],
  cart: readStored('cart', []),
  lastOrder: null
};

const $ = (id) => document.getElementById(id);

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function money(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, { ...options, headers });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  renderCart();
}

function totals() {
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const iva = Math.round(subtotal * 0.19);
  return { subtotal, iva, total: subtotal + iva };
}

function showAuth() {
  $('auth-view').hidden = false;
  $('shop-view').hidden = true;
  $('success-view').hidden = true;
}

function showShop() {
  $('auth-view').hidden = true;
  $('shop-view').hidden = false;
  $('success-view').hidden = true;
  renderSession();
  renderCart();
}

function renderSession() {
  if (!state.user) {
    $('session').innerHTML = '';
    return;
  }
  $('session').innerHTML = `
    <span>Hola, ${escapeHtml(state.user.name)}</span>
    <button type="button" id="logout-btn">Salir</button>
  `;
}

async function authenticate(mode) {
  const name = $('auth-name').value.trim();
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;

  $('auth-msg').textContent = '';
  $('auth-msg').classList.remove('ok');

  if (mode === 'register' && !name) {
    $('auth-msg').textContent = 'Escribe tu nombre para crear la cuenta.';
    return;
  }

  try {
    const data = await api(`/api/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', state.token);
    localStorage.setItem('user', JSON.stringify(state.user));
    $('auth-form').reset();
    showShop();
  } catch (error) {
    $('auth-msg').textContent = error.message;
  }
}

function logout() {
  state.token = '';
  state.user = null;
  state.cart = [];
  state.lastOrder = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('cart');
  $('pay-modal').hidden = true;
  $('session').innerHTML = '';
  renderCart();
  showAuth();
}

function renderProducts() {
  $('products').innerHTML = state.products.map((product) => `
    <article class="product">
      <div class="thumb" style="background:${product.color}">${escapeHtml(product.name.charAt(0))}</div>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.description)}</p>
      <div class="price">${money(product.price)}</div>
      <button type="button" class="primary" data-add="${product.id}">Agregar</button>
    </article>
  `).join('');
}

function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  const existing = state.cart.find((item) => item.id === id);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + 1);
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }

  $('cart-msg').textContent = '';
  saveCart();
}

function changeCart(action, id) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;

  if (action === 'inc') item.qty = Math.min(99, item.qty + 1);
  if (action === 'dec') item.qty -= 1;
  if (action === 'remove') item.qty = 0;
  if (item.qty <= 0) state.cart = state.cart.filter((entry) => entry.id !== id);

  saveCart();
}

function renderCart() {
  const container = $('cart');

  if (!state.cart.length) {
    container.innerHTML = '<p class="muted">Tu carrito está vacío.</p>';
  } else {
    container.innerHTML = state.cart.map((item) => `
      <div class="cart-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="muted">${money(item.price)} c/u</div>
        </div>
        <button type="button" class="link" data-action="remove" data-id="${item.id}">Quitar</button>
        <div class="qty">
          <button type="button" data-action="dec" data-id="${item.id}">-</button>
          <span>${item.qty}</span>
          <button type="button" data-action="inc" data-id="${item.id}">+</button>
        </div>
        <div class="line-total">${money(item.price * item.qty)}</div>
      </div>
    `).join('');
  }

  const value = totals();
  $('totals').innerHTML = `
    <div class="line"><span>Subtotal</span><span>${money(value.subtotal)}</span></div>
    <div class="line"><span>IVA (19%)</span><span>${money(value.iva)}</span></div>
    <div class="line total"><span>Total</span><span>${money(value.total)}</span></div>
  `;

  $('checkout-btn').disabled = !state.cart.length;
}

function showSuccess(data) {
  const order = data.order;
  const items = data.items || [];

  $('success-summary').innerHTML = `
    <div class="line"><span>Pedido</span><span>${escapeHtml(order.id.slice(0, 8))}...</span></div>
    <div class="line"><span>Transacción</span><span>${escapeHtml(order.transaction_id)}</span></div>
    ${items.map((item) => `
      <div class="line">
        <span>${escapeHtml(item.name)} x ${item.qty}</span>
        <span>${money(item.line_total)}</span>
      </div>
    `).join('')}
    <div class="line"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    <div class="line"><span>IVA (19%)</span><span>${money(order.iva)}</span></div>
    <div class="line"><span><strong>Total pagado</strong></span><span><strong>${money(order.total)}</strong></span></div>
    <div class="line"><span>Tarjeta</span><span>**** ${escapeHtml(order.card_last4)}</span></div>
    <div class="line"><span>Fecha</span><span>${new Date(order.created_at).toLocaleString('es-CO')}</span></div>
  `;

  const message = $('success-msg');
  message.textContent = data.iva_fallback
    ? 'El microservicio de IVA no respondió; el impuesto se calculó localmente.'
    : '';
  message.classList.toggle('ok', Boolean(data.iva_fallback));

  $('auth-view').hidden = true;
  $('shop-view').hidden = true;
  $('success-view').hidden = false;
}

async function downloadReceipt() {
  if (!state.lastOrder) return;

  const button = $('download-btn');
  const message = $('success-msg');
  button.disabled = true;
  message.textContent = 'Generando comprobante PDF...';
  message.classList.add('ok');

  try {
    const response = await fetch(`/api/orders/${state.lastOrder.id}/receipt`, {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (!response.ok) {
      let detail = 'No se pudo descargar el comprobante';
      try {
        const data = await response.json();
        detail = data.error || detail;
      } catch {
        detail = 'No se pudo descargar el comprobante';
      }
      throw new Error(detail);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante-${state.lastOrder.id.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    message.textContent = 'Comprobante descargado.';
    message.classList.add('ok');
  } catch (error) {
    message.textContent = error.message;
    message.classList.remove('ok');
  } finally {
    button.disabled = false;
  }
}

function bindEvents() {
  $('auth-form').addEventListener('submit', (event) => {
    event.preventDefault();
    authenticate('login');
  });

  $('register-btn').addEventListener('click', () => authenticate('register'));

  $('session').addEventListener('click', (event) => {
    if (event.target.id === 'logout-btn') logout();
  });

  $('products').addEventListener('click', (event) => {
    const button = event.target.closest('[data-add]');
    if (button) addToCart(Number(button.dataset.add));
  });

  $('cart').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button) changeCart(button.dataset.action, Number(button.dataset.id));
  });

  $('checkout-btn').addEventListener('click', () => {
    if (!state.cart.length) return;

    if (!$('card-number').value) $('card-number').value = '4242 4242 4242 4242';
    if (!$('card-name').value) $('card-name').value = state.user?.name || 'Cliente Demo';
    if (!$('card-expiry').value) $('card-expiry').value = '12/30';
    if (!$('card-cvv').value) $('card-cvv').value = '123';

    $('pay-btn').textContent = `Pagar ${money(totals().total)}`;
    $('pay-msg').textContent = '';
    $('pay-msg').classList.remove('ok');
    $('pay-modal').hidden = false;
    $('card-name').focus();
  });

  $('cancel-pay').addEventListener('click', () => {
    $('pay-modal').hidden = true;
  });

  $('card-number').addEventListener('input', (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 16);
    event.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
  });

  $('card-expiry').addEventListener('input', (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  $('card-cvv').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
  });

  $('pay-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = $('pay-btn');
    const message = $('pay-msg');
    button.disabled = true;
    message.textContent = 'Procesando pago simulado...';
    message.classList.add('ok');

    try {
      const data = await api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: state.cart.map((item) => ({ id: item.id, qty: item.qty })),
          card: {
            name: $('card-name').value,
            number: $('card-number').value,
            expiry: $('card-expiry').value,
            cvv: $('card-cvv').value
          }
        })
      });

      state.lastOrder = data.order;
      state.cart = [];
      saveCart();
      $('pay-modal').hidden = true;
      $('pay-form').reset();
      showSuccess(data);
    } catch (error) {
      message.textContent = error.message;
      message.classList.remove('ok');
    } finally {
      button.disabled = false;
    }
  });

  $('download-btn').addEventListener('click', downloadReceipt);

  $('continue-btn').addEventListener('click', () => {
    $('success-msg').textContent = '';
    showShop();
  });
}

async function boot() {
  bindEvents();

  try {
    state.products = await api('/api/products');
  } catch (error) {
    $('auth-msg').textContent = 'No se pudo cargar el catálogo. Intenta recargar.';
  }

  renderProducts();

  if (state.token) {
    try {
      const data = await api('/api/auth/me');
      state.user = data.user;
      showShop();
    } catch {
      logout();
    }
  } else {
    showAuth();
  }

  renderCart();
}

boot();
