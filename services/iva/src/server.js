require('dotenv').config();

const express = require('express');

const app = express();
const PORT = process.env.PORT || 4001;
const RATE = Number(process.env.IVA_RATE || 0.19);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ms-iva', rate: RATE });
});

app.post('/calcular', (req, res) => {
  const subtotal = Number(req.body?.subtotal);

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ error: 'El subtotal debe ser un número mayor o igual a cero' });
  }

  const iva = Math.round(subtotal * RATE);

  res.json({
    subtotal,
    tasa: RATE,
    iva,
    total: subtotal + iva
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`[ms-iva] Escuchando en http://localhost:${PORT}`);
});
