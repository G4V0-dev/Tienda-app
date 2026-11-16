/**
 * Contrato OpenAPI de ms-iva.
 * Se publica en /openapi.json y se visualiza en /docs.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ms-iva',
    version: '1.0.0',
    description: 'Microservicio que calcula el IVA de un subtotal en pesos colombianos.'
  },
  servers: [
    { url: 'http://localhost:4001', description: 'Local' },
    { url: 'https://tienda-iva.onrender.com', description: 'Render (ajusta el dominio)' }
  ],
  tags: [{ name: 'IVA', description: 'Cálculo de impuestos' }],
  paths: {
    '/health': {
      get: {
        tags: ['IVA'],
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
    '/calcular': {
      post: {
        tags: ['IVA'],
        summary: 'Calcula IVA y total a partir del subtotal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalculateRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Cálculo exitoso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CalculateResponse' }
              }
            }
          },
          400: {
            description: 'Subtotal inválido',
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
          error: { type: 'string', example: 'El subtotal debe ser un número mayor o igual a cero' }
        }
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          service: { type: 'string', example: 'ms-iva' },
          rate: { type: 'number', example: 0.19 }
        }
      },
      CalculateRequest: {
        type: 'object',
        required: ['subtotal'],
        properties: {
          subtotal: {
            description: 'Acepta número o cadena numérica',
            oneOf: [
              { type: 'number', minimum: 0, example: 100000 },
              { type: 'string', example: '100000' }
            ]
          }
        }
      },
      CalculateResponse: {
        type: 'object',
        properties: {
          subtotal: { type: 'number', example: 100000 },
          tasa: { type: 'number', description: 'Tasa de IVA aplicada', example: 0.19 },
          iva: { type: 'number', example: 19000 },
          total: { type: 'number', example: 119000 }
        }
      }
    }
  }
};
