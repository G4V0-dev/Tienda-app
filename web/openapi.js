/**
 * Contrato OpenAPI de tienda-web.
 * Se publica en /openapi.json y se visualiza en /docs.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tienda Web API',
    version: '1.0.0',
    description:
      'API de la tienda: catálogo, autenticación JWT con roles, checkout simulado con stock ' +
      'y comprobante PDF. Orquesta los microservicios ms-iva y ms-pdf.'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local' },
    { url: 'https://tienda-web.onrender.com', description: 'Render (ajusta el dominio)' }
  ],
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Catálogo', description: 'Productos disponibles' },
    { name: 'Autenticación', description: 'Registro, login, sesión y roles' },
    { name: 'Órdenes', description: 'Checkout, consulta y comprobante' },
    { name: 'Administración', description: 'CRUD de productos y stock (rol admin)' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado de la web y la base de datos',
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
    '/api/products': {
      get: {
        tags: ['Catálogo'],
        summary: 'Lista los productos activos con stock',
        description: 'Los productos con stock 0 se listan, pero el checkout los rechaza.',
        responses: {
          200: {
            description: 'Catálogo',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registra un usuario y devuelve un JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Usuario creado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: {
            description: 'El correo ya está registrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Inicia sesión y devuelve un JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Sesión iniciada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: {
            description: 'Credenciales incorrectas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Devuelve el usuario del JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Usuario autenticado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/checkout': {
      post: {
        tags: ['Órdenes'],
        summary: 'Valida el carrito, calcula IVA, simula el pago y crea la orden',
        description:
          'Los precios y cantidades se recalculan en el servidor. El IVA se pide a ms-iva; ' +
          'si no responde, se calcula localmente y se marca `iva_fallback: true`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Orden creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckoutResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: {
            description: 'Stock insuficiente para uno o más productos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Órdenes'],
        summary: 'Consulta una orden del usuario autenticado',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Orden e ítems',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/orders/{id}/receipt': {
      get: {
        tags: ['Órdenes'],
        summary: 'Descarga el comprobante PDF de una orden',
        description: 'Delegado en ms-pdf. Responde 502 si el microservicio no está disponible.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Archivo PDF',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          502: {
            description: 'ms-pdf no disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/admin/products': {
      get: {
        tags: ['Administración'],
        summary: 'Lista todos los productos, incluidos los inactivos',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Productos para el panel',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AdminProduct' }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' }
        }
      },
      post: {
        tags: ['Administración'],
        summary: 'Crea un producto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Producto creado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminProduct' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' }
        }
      }
    },
    '/api/admin/products/{id}': {
      put: {
        tags: ['Administración'],
        summary: 'Actualiza precio, nombre, stock u otros campos',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdate' }
            }
          }
        },
        responses: {
          200: {
            description: 'Producto actualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminProduct' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' }
        }
      },
      delete: {
        tags: ['Administración'],
        summary: 'Desactiva un producto (borrado lógico)',
        description: 'Deja de aparecer en el catálogo y puede reactivarse con active=1.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 }
          }
        ],
        responses: {
          200: {
            description: 'Producto desactivado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminProduct' }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token devuelto por /api/auth/register o /api/auth/login. Expira en 7 días.'
      }
    },
    responses: {
      BadRequest: {
        description: 'Datos inválidos',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Unauthorized: {
        description: 'Sesión inválida o expirada',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Forbidden: {
        description: 'El usuario no tiene rol de administrador',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Datos inválidos' }
        }
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          service: { type: 'string', example: 'tienda-web' },
          database: { type: 'string', enum: ['supabase', 'sqlite'], example: 'sqlite' },
          iva: { type: 'string', example: 'http://localhost:4001' },
          pdf: { type: 'string', example: 'http://localhost:4002' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Camiseta Clásica' },
          description: { type: 'string', example: 'Algodón 100%, corte regular, uso diario.' },
          price: { type: 'integer', description: 'Precio en COP', example: 45000 },
          color: { type: 'string', example: '#dbe4ee' },
          stock: { type: 'integer', description: 'Unidades disponibles', example: 500 }
        }
      },
      AdminProduct: {
        allOf: [
          { $ref: '#/components/schemas/Product' },
          {
            type: 'object',
            properties: {
              active: { type: 'integer', enum: [0, 1], example: 1 },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          }
        ]
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string', maxLength: 80, example: 'Bufanda de Lana' },
          description: { type: 'string', maxLength: 240, example: 'Tejido suave, unisex.' },
          price: { type: 'integer', minimum: 0, maximum: 100000000, example: 30000 },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$', example: '#aabbcc' },
          stock: { type: 'integer', minimum: 0, maximum: 9999, default: 0, example: 10 }
        }
      },
      ProductUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 80 },
          description: { type: 'string', maxLength: 240 },
          price: { type: 'integer', minimum: 0, maximum: 100000000 },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          stock: { type: 'integer', minimum: 0, maximum: 9999 },
          active: { type: 'integer', enum: [0, 1], description: '0 desactiva y 1 reactiva' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Cliente de Prueba' },
          email: { type: 'string', format: 'email', example: 'cliente@example.com' },
          role: { type: 'string', enum: ['admin', 'user'], example: 'user' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        description:
          'El rol no se acepta desde el cliente. Los correos listados en ADMIN_EMAILS ' +
          'se registran como admin; el resto como user.',
        properties: {
          name: { type: 'string', example: 'Cliente de Prueba' },
          email: { type: 'string', format: 'email', example: 'cliente@example.com' },
          password: { type: 'string', minLength: 6, example: 'secreto123' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'cliente@example.com' },
          password: { type: 'string', example: 'secreto123' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT válido por 7 días' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      CartItemRequest: {
        type: 'object',
        required: ['id', 'qty'],
        properties: {
          id: { type: 'integer', description: 'ID del producto', example: 1 },
          qty: { type: 'integer', minimum: 1, maximum: 99, example: 3 }
        }
      },
      Card: {
        type: 'object',
        required: ['number', 'name', 'expiry', 'cvv'],
        description: 'Datos ficticios. No se cobra dinero real.',
        properties: {
          number: { type: 'string', example: '4242424242424242', description: '15 o 16 dígitos' },
          name: { type: 'string', example: 'Cliente de Prueba' },
          expiry: { type: 'string', pattern: '^\\d{2}/\\d{2}$', example: '12/30' },
          cvv: { type: 'string', pattern: '^\\d{3,4}$', example: '123' }
        }
      },
      CheckoutRequest: {
        type: 'object',
        required: ['items', 'card'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/CartItemRequest' }
          },
          card: { $ref: '#/components/schemas/Card' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          subtotal: { type: 'integer', example: 255000 },
          iva: { type: 'integer', example: 48450 },
          total: { type: 'integer', example: 303450 },
          status: { type: 'string', example: 'aprobado' },
          card_last4: { type: 'string', example: '4242' },
          transaction_id: { type: 'string', example: 'TX-1730000000000-1234' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      CheckoutItem: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Camiseta Clásica' },
          price: { type: 'integer', example: 45000 },
          qty: { type: 'integer', example: 3 },
          line_total: { type: 'integer', example: 135000 }
        }
      },
      CheckoutResponse: {
        type: 'object',
        properties: {
          order: { $ref: '#/components/schemas/Order' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CheckoutItem' }
          },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Cliente de Prueba' },
              email: { type: 'string', format: 'email' }
            }
          },
          iva_fallback: {
            type: 'boolean',
            description: 'true si ms-iva no respondió y el IVA se calculó localmente'
          }
        }
      },
      OrderItemRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order_id: { type: 'string', format: 'uuid' },
          product_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Camiseta Clásica' },
          price: { type: 'integer', example: 45000 },
          qty: { type: 'integer', example: 3 }
        }
      },
      OrderResponse: {
        type: 'object',
        properties: {
          order: { $ref: '#/components/schemas/Order' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItemRecord' }
          }
        }
      }
    }
  }
};
