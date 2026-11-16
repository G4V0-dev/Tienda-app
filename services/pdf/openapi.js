/**
 * Contrato OpenAPI de ms-pdf.
 * Se publica en /openapi.json y se visualiza en /docs.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ms-pdf',
    version: '1.0.0',
    description: 'Microservicio que genera el comprobante de pago en PDF (documento ficticio sin validez fiscal).'
  },
  servers: [
    { url: 'http://localhost:4002', description: 'Local' },
    { url: 'https://tienda-pdf.onrender.com', description: 'Render (ajusta el dominio)' }
  ],
  tags: [{ name: 'Comprobante', description: 'Generación de PDF' }],
  paths: {
    '/health': {
      get: {
        tags: ['Comprobante'],
        summary: 'Estado del servicio',
        responses: {
          200: {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' }
              }
            }
          }
        }
      }
    },
    '/comprobante': {
      post: {
        tags: ['Comprobante'],
        summary: 'Genera el comprobante PDF de una orden',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReceiptRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Archivo PDF',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          400: {
            description: 'Datos del comprobante incompletos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'Error al generar el PDF',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Datos del comprobante incompletos' }
        }
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          service: { type: 'string', example: 'ms-pdf' },
          company: { type: 'string', example: 'Tienda Básica S.A.S.' }
        }
      },
      ReceiptOrder: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', example: '7f3c1a2b-9d4e-4c5f-8a6b-1c2d3e4f5a6b' },
          subtotal: { type: 'integer', example: 255000 },
          iva: { type: 'integer', example: 48450 },
          total: { type: 'integer', example: 303450 },
          status: { type: 'string', example: 'aprobado' },
          card_last4: { type: 'string', example: '4242' },
          transaction_id: { type: 'string', example: 'TX-1730000000000-1234' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ReceiptItem: {
        type: 'object',
        required: ['name', 'price', 'qty'],
        properties: {
          name: { type: 'string', example: 'Camiseta Clásica' },
          price: { type: 'number', example: 45000 },
          qty: { type: 'number', example: 3 }
        }
      },
      ReceiptCustomer: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Cliente de Prueba' },
          email: { type: 'string', format: 'email', example: 'cliente@example.com' }
        }
      },
      ReceiptRequest: {
        type: 'object',
        required: ['order', 'items'],
        properties: {
          order: { $ref: '#/components/schemas/ReceiptOrder' },
          items: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/ReceiptItem' }
          },
          customer: { $ref: '#/components/schemas/ReceiptCustomer' }
        }
      }
    }
  }
};
