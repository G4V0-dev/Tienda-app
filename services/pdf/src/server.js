require('dotenv').config();

const express = require('express');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 4002;

const COMPANY = {
  name: process.env.COMPANY_NAME || 'Tienda Básica S.A.S.',
  nit: process.env.COMPANY_NIT || '901.234.567-8',
  address: process.env.COMPANY_ADDRESS || 'Calle 123 #45-67, Bogotá, Colombia',
  phone: process.env.COMPANY_PHONE || '+57 601 123 4567'
};

app.use(express.json({ limit: '1mb' }));

function money(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function shortId(value) {
  return String(value || '').slice(0, 8).toUpperCase();
}

function drawReceipt(doc, order, items, customer) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#111111');
  doc.text(COMPANY.name, 50, 50, { width: 290 });

  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(`NIT ${COMPANY.nit}`, 50, 76, { width: 290 });
  doc.text(COMPANY.address, 50, 90, { width: 290 });
  doc.text(COMPANY.phone, 50, 104, { width: 290 });

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111111');
  doc.text('COMPROBANTE DE PAGO', 350, 50, { width: 195, align: 'right' });

  doc.font('Helvetica').fontSize(8).fillColor('#555555');
  doc.text(`Pedido: ${shortId(order.id)}`, 350, 72, { width: 195, align: 'right' });
  doc.text(`Transacción: ${order.transaction_id || '-'}`, 350, 86, { width: 195, align: 'right' });
  doc.text(`Fecha: ${dateLabel(order.created_at)}`, 350, 100, { width: 195, align: 'right' });
  doc.text(`Estado: ${String(order.status || 'aprobado').toUpperCase()}`, 350, 114, { width: 195, align: 'right' });

  doc.moveTo(50, 134).lineTo(545, 134).strokeColor('#bbbbbb').stroke();

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111');
  doc.text('Cliente', 50, 150);
  doc.font('Helvetica').fontSize(9).fillColor('#444444');
  doc.text(customer?.name || 'Cliente', 50, 166, { width: 250 });
  doc.text(customer?.email || '', 50, 180, { width: 250 });
  doc.text(`Pago: Tarjeta **** ${order.card_last4 || '0000'}`, 50, 194, { width: 250 });

  let y = 222;

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111');
  doc.text('Producto', 50, y, { width: 270 });
  doc.text('Cant.', 320, y, { width: 50, align: 'right' });
  doc.text('Precio', 390, y, { width: 70, align: 'right' });
  doc.text('Total', 470, y, { width: 75, align: 'right' });

  y += 16;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#bbbbbb').stroke();
  y += 10;

  doc.font('Helvetica').fontSize(9).fillColor('#222222');

  for (const item of items) {
    if (y > 680) {
      doc.addPage();
      y = 60;
    }

    const rowHeight = Math.max(18, doc.heightOfString(String(item.name), { width: 270 }) + 6);

    doc.text(String(item.name), 50, y, { width: 270 });
    doc.text(String(item.qty), 320, y, { width: 50, align: 'right' });
    doc.text(money(item.price), 390, y, { width: 70, align: 'right' });
    doc.text(money(Number(item.price) * Number(item.qty)), 470, y, {
      width: 75,
      align: 'right'
    });

    y += rowHeight;
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#bbbbbb').stroke();
  y += 12;

  doc.font('Helvetica').fontSize(10).fillColor('#333333');
  doc.text('Subtotal', 390, y, { width: 70, align: 'right' });
  doc.text(money(order.subtotal), 470, y, { width: 75, align: 'right' });

  y += 18;
  doc.text('IVA (19%)', 390, y, { width: 70, align: 'right' });
  doc.text(money(order.iva), 470, y, { width: 75, align: 'right' });

  y += 20;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111');
  doc.text('Total pagado', 370, y, { width: 90, align: 'right' });
  doc.text(money(order.total), 470, y, { width: 75, align: 'right' });

  doc.font('Helvetica').fontSize(8).fillColor('#777777');
  doc.text(
    'Comprobante generado automáticamente. Documento ficticio sin validez fiscal.',
    50,
    760,
    { width: 495, align: 'center' }
  );
  doc.text('Gracias por tu compra.', 50, 772, { width: 495, align: 'center' });
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ms-pdf', company: COMPANY.name });
});

app.post('/comprobante', (req, res) => {
  const { order, items, customer } = req.body || {};

  if (!order || !order.id || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Datos del comprobante incompletos' });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  let failed = false;

  doc.info.Title = `Comprobante ${shortId(order.id)}`;
  doc.info.Author = COMPANY.name;

  doc.on('data', (chunk) => chunks.push(chunk));

  doc.on('end', () => {
    if (failed) return;
    const pdf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comprobante-${shortId(order.id).toLowerCase()}.pdf"`
    );
    res.send(pdf);
  });

  doc.on('error', (error) => {
    failed = true;
    console.error('[ms-pdf] Error al generar PDF:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el comprobante PDF' });
    }
  });

  try {
    drawReceipt(doc, order, items, customer);
    doc.end();
  } catch (error) {
    failed = true;
    console.error('[ms-pdf] Error al dibujar PDF:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el comprobante PDF' });
    }
    doc.end();
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`[ms-pdf] Escuchando en http://localhost:${PORT}`);
});
