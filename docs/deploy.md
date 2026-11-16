# Despliegue en Render

El repo incluye [`render.yaml`](../render.yaml), que crea los tres servicios en el plan gratuito.

## Antes de empezar

- Cuenta de Render y un proyecto de Supabase.
- El repositorio conectado a Render.
- Cadena de conexión de Supabase: **Project Settings > Database > Connection string > Session pooler**, con `?sslmode=require` y la contraseña codificada en URL.

## Cinco pasos

1. En Render entra a **New > Blueprint** y conecta el repositorio.
2. Render detecta `render.yaml` y muestra los tres servicios: `tienda-web`, `tienda-iva` y `tienda-pdf`.
3. Cuando pida `SUPABASE_DB_URL`, pega la cadena de Supabase.
4. Crea el blueprint y espera a que terminen los tres despliegues.
5. Verifica la salud y el flujo completo:

```bash
curl https://tienda-iva.onrender.com/health
curl https://tienda-pdf.onrender.com/health
curl https://tienda-web.onrender.com/api/health
BASE_URL=https://tienda-web.onrender.com npm run smoke
```

`JWT_SECRET` se genera automáticamente. `IVA_URL` y `PDF_URL` se enlazan con `fromService`; si las defines a mano, el código agrega `https://` cuando falta el esquema.

## Ajustes opcionales

| Variable | Servicio | Uso |
| --- | --- | --- |
| `IVA_RATE` | `tienda-iva` | Tasa de IVA; por defecto `0.19` |
| `COMPANY_NAME`, `COMPANY_NIT`, `COMPANY_ADDRESS`, `COMPANY_PHONE` | `tienda-pdf` | Datos del encabezado del PDF |
| `CORS_ORIGIN` | `tienda-web` | Origen permitido; por defecto `*` |
| `DATA_DIR` | `tienda-web` | Ruta del SQLite; requiere disco persistente |

## Notas

- Los servicios gratuitos se suspenden por inactividad: la primera petición puede tardar 30–60 s.
- El disco de Render es efímero. SQLite se pierde en cada reinicio, pero Supabase conserva los datos; el disco persistente exige plan de pago.
- Si cambias variables, usa **Manual Deploy > Deploy latest commit**.
- Las tablas se crean al iniciar `tienda-web`. También puedes ejecutar [`supabase/schema.sql`](../supabase/schema.sql) en el SQL Editor.
