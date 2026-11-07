# Tienda Básica

Aplicación real de carrito de compras con autenticación, catálogo de ropa básica, cálculo de IVA por microservicio, pago simulado y comprobante PDF descargable.

## Arquitectura

```
Navegador
   |
   v
tienda-web (Express: frontend + API + JWT)
   |----> ms-iva  (microservicio de IVA 19%)
   |----> ms-pdf  (microservicio de comprobante PDF)
   |----> Supabase Postgres (base de datos en la nube)
   |----> SQLite local (respaldo + cola de sincronización)
```

Tres servicios independientes en Render:

| Servicio | Carpeta | Función |
| --- | --- | --- |
| `tienda-web` | `web/` | Frontend, login, carrito, órdenes y orquestación |
| `tienda-iva` | `services/iva/` | Calcula subtotal, IVA 19% y total |
| `tienda-pdf` | `services/pdf/` | Genera el comprobante de pago en PDF |

## Estructura

```
tienda-app/
  render.yaml
  supabase/schema.sql
  web/
    src/server.js
    src/db.js
    src/products.js
    public/index.html
    public/app.js
    public/styles.css
  services/iva/src/server.js
  services/pdf/src/server.js
```

## Requisitos

- Node.js 20 o superior
- Cuenta de Supabase
- Cuenta de Render
- Git y una cuenta de GitHub

## Ejecutar en local

No necesitas Supabase para probar. Si `SUPABASE_DB_URL` no está definida, la app usa SQLite automáticamente.

Abre tres terminales.

Terminal 1, microservicio de IVA:

```bash
cd services/iva
npm install
npm start
```

Terminal 2, microservicio de PDF:

```bash
cd services/pdf
npm install
npm start
```

Terminal 3, aplicación web:

```bash
cd web
npm install
npm start
```

Abre `http://localhost:3000`.

Datos de prueba:

- Regístrate con cualquier correo y una contraseña de mínimo 6 caracteres.
- Tarjeta ficticia: `4242 4242 4242 4242`
- Vencimiento: `12/30`
- CVV: `123`

La app rellena esos datos automáticamente la primera vez que abres el pago.

### Variables de entorno locales

Cada servicio trae un `.env.example`. Para usar Supabase en local:

```bash
cd web
copy .env.example .env
```

Edita `web/.env` con tu cadena de conexión real. En Linux o macOS usa `cp .env.example .env`.

## Configurar Supabase

1. Entra a [https://supabase.com](https://supabase.com) y crea un proyecto.
2. Espera a que termine el aprovisionamiento.
3. Ve a **Project Settings > Database > Connection string > URI**.
4. Copia la cadena **Session pooler** (recomendada para Render).
5. Reemplaza `[YOUR-PASSWORD]` por la contraseña del proyecto.
6. Si la contraseña tiene caracteres especiales, codifícalos en URL. Por ejemplo `@` se escribe `%40`.
7. Asegúrate de que termine en `?sslmode=require`.

Ejemplo:

```
postgresql://postgres.abcdefghij:MiClaveSegura@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

La aplicación crea las tablas automáticamente al iniciar `tienda-web`. Si prefieres crearlas manualmente, ejecuta `supabase/schema.sql` en el **SQL Editor** de Supabase.

Tablas creadas:

- `users`
- `orders`
- `order_items`
- `sync_queue` (solo se usa en SQLite para la cola de sincronización)

## Despliegue en Render

### Opción A: Blueprint con render.yaml

1. Sube el proyecto a GitHub (ver sección de Git más abajo).
2. En Render entra a **New > Blueprint**.
3. Conecta el repositorio.
4. Render detecta `render.yaml` y crea los tres servicios.
5. Cuando pida `SUPABASE_DB_URL`, pega la cadena de conexión de Supabase.
6. Espera a que terminen los tres despliegues.
7. Abre cada servicio y copia su URL pública.
8. Verifica que `tienda-web` tenga estas variables:
   - `IVA_URL`: URL de `tienda-iva`
   - `PDF_URL`: URL de `tienda-pdf`
   - `JWT_SECRET`: generada automáticamente
   - `SUPABASE_DB_URL`: cadena de Supabase
9. Si cambiaste alguna variable, haz **Manual Deploy > Deploy latest commit**.

El `render.yaml` configura `IVA_URL` y `PDF_URL` con `fromService`. El código agrega `https://` automáticamente si la variable viene sin esquema.

### Opción B: Crear los servicios a mano

Crea primero los dos microservicios y al final la web.

Para cada servicio usa:

- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health` en microservicios, `/api/health` en la web
- **Instance Type**: Free

#### 1. tienda-iva

- **Root Directory**: `services/iva`
- Variables:
  - `NODE_VERSION=20`
  - `IVA_RATE=0.19`

#### 2. tienda-pdf

- **Root Directory**: `services/pdf`
- Variables:
  - `NODE_VERSION=20`
  - `COMPANY_NAME=Tienda Básica S.A.S.`
  - `COMPANY_NIT=901.234.567-8`
  - `COMPANY_ADDRESS=Calle 123 #45-67, Bogotá, Colombia`
  - `COMPANY_PHONE=+57 601 123 4567`

#### 3. tienda-web

- **Root Directory**: `web`
- Variables:
  - `NODE_VERSION=20`
  - `JWT_SECRET`: una cadena larga y aleatoria
  - `SUPABASE_DB_URL`: cadena de conexión de Supabase
  - `IVA_URL`: `https://tienda-iva.onrender.com`
  - `PDF_URL`: `https://tienda-pdf.onrender.com`
  - `DATA_DIR=/data` (opcional, requiere disco persistente)

Reemplaza los dominios por los que Render te asigne.

### Disco para SQLite en Render

Sin disco, el sistema de archivos de Render es efímero: el archivo SQLite se pierde en cada despliegue o reinicio. La app sigue funcionando porque Supabase es la fuente principal, pero el respaldo local no persiste.

Para conservar el respaldo:

1. En `tienda-web` ve a **Settings > Disks > Add Disk**.
2. Mount Path: `/data`.
3. Agrega la variable `DATA_DIR=/data`.
4. Redeploy.

Render exige una instancia de pago para usar discos persistentes. En el plan gratuito el respaldo SQLite funciona solo mientras el proceso esté vivo.

### Plan gratuito de Render

- Los servicios gratuitos se suspenden tras unos minutos de inactividad.
- La primera petición puede tardar 30 a 60 segundos.
- Abre las URLs de salud antes de una demostración:
  - `https://tienda-iva.onrender.com/health`
  - `https://tienda-pdf.onrender.com/health`
  - `https://tienda-web.onrender.com/api/health`

La app tolera el arranque lento del microservicio de IVA con un cálculo local de respaldo y muestra una advertencia. El PDF puede fallar si el servicio está dormido; vuelve a intentar después de despertarlo.

## Flujo de compra

1. El usuario se registra o inicia sesión. Se guarda un JWT en `localStorage`.
2. Agrega productos al carrito. Las cantidades se acumulan.
3. El carrito muestra subtotal, IVA 19% y total.
4. Al pagar se abre una pasarela ficticia. No se cobra dinero real.
5. `POST /api/checkout` valida el JWT y recalcula los precios en el servidor.
6. La web llama a `ms-iva` para obtener el IVA y el total definitivos.
7. El pago se aprueba automáticamente.
8. Se guardan la orden y sus ítems en Supabase, con copia local en SQLite.
9. La pantalla de éxito muestra pedido, transacción, total y tarjeta.
10. El botón de descarga pide el PDF a `ms-pdf`.

## Respaldo SQLite y cola de sincronización

El comportamiento es local-first:

1. Cada escritura se guarda primero en SQLite.
2. Luego se intenta escribir en Supabase.
3. Si Supabase falla por conectividad, la operación queda en `sync_queue`.
4. Cada 30 segundos se comprueba la conexión.
5. Al recuperarse, se crean las tablas si hace falta y se reproduce la cola.
6. Las lecturas usan Supabase y caen a SQLite si la nube no responde.

Para probar el respaldo:

1. Configura una `SUPABASE_DB_URL` inválida y arranca `tienda-web`.
2. Verás en el log `Supabase no disponible al iniciar. Se usa SQLite`.
3. Registra un usuario y haz una compra.
4. Corrige la URL y reinicia el proceso. También funciona sin reiniciar si la caída fue temporal de red.
5. Verifica en Supabase que aparezcan el usuario y la orden.

Si la URL es inválida, el proceso necesita reiniciarse porque las variables de entorno se leen al arrancar.

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/health` | Estado de la web y de la base de datos |
| GET | `/api/products` | Catálogo de 6 productos |
| POST | `/api/auth/register` | Registro con nombre, correo y contraseña |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/me` | Usuario del JWT |
| POST | `/api/checkout` | Valida carrito, calcula IVA, simula pago y crea la orden |
| GET | `/api/orders/:id` | Consulta una orden del usuario |
| GET | `/api/orders/:id/receipt` | Descarga el comprobante PDF |

Microservicios:

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servicio |
| POST | `/calcular` | Recibe `{ "subtotal": 100000 }` y devuelve IVA y total |
| POST | `/comprobante` | Recibe la orden y devuelve un PDF |

Prueba rápida del IVA:

```bash
curl -X POST http://localhost:4001/calcular \
  -H "Content-Type: application/json" \
  -d "{\"subtotal\":100000}"
```

Respuesta esperada:

```json
{ "subtotal": 100000, "tasa": 0.19, "iva": 19000, "total": 119000 }
```

## Subir el proyecto a GitHub

El repositorio de destino es `https://github.com/G4V0-dev/tienda-app`. Si usas otro nombre, cámbialo en los comandos.

Primero crea el repositorio vacío en GitHub:

1. Entra a [https://github.com/new](https://github.com/new).
2. Nombre: `tienda-app`.
3. No marques README, `.gitignore` ni licencia.
4. Crea el repositorio.

Luego, desde la carpeta del proyecto:

```bash
cd C:\Users\Estudiantes\tienda-app

git init
git config --local user.name "G4V0-dev"
git config --local user.email "TU_CORREO_DE_GITHUB"

git add .
git commit -m "Tienda con carrito, autenticacion, IVA y comprobante PDF"
git branch -M main
git remote add origin https://github.com/G4V0-dev/tienda-app.git
git push -u origin main
```

Notas de seguridad:

- No pegues contraseñas ni tokens personales en el chat ni en archivos del proyecto.
- Si Git pide autenticación, usa el navegador de Git Credential Manager o un token clásico con permiso `repo` como contraseña.
- Nunca guardes el token dentro de la URL del remoto.
- Verifica el remoto con `git remote -v`. Debe verse solo `https://github.com/G4V0-dev/tienda-app.git`.

## Eliminar credenciales de Git después de subir

Esto borra las credenciales guardadas en Windows, no el repositorio ni tu cuenta.

Listar credenciales:

```bash
cmdkey /list
```

Busca una entrada de GitHub y bórrala:

```bash
cmdkey /delete:git:https://github.com
```

También puedes usar Git Credential Manager:

```bash
git credential-manager erase
```

Cuando pregunte, usa:

```
protocol=https
host=github.com
```

Si instalaste GitHub CLI:

```bash
gh auth logout
```

Elimina la identidad local del repositorio si no la quieres conservar:

```bash
git config --local --unset user.name
git config --local --unset user.email
```

Ten en cuenta que necesitarás configurar una identidad de nuevo para futuros commits.

Si lo que quieres es eliminar la cuenta de GitHub, eso se hace en **Settings > Account > Delete account**. Es irreversible y borra también el repositorio. Para seguridad normalmente basta con cerrar sesiones, revocar tokens y activar 2FA.

## Seguridad y alcance

- El pago es completamente ficticio. No hay pasarela real ni cobro.
- No uses números de tarjeta reales en la demo.
- Las contraseñas se guardan con bcrypt.
- Los JWT expiran en 7 días y se firman con `JWT_SECRET`.
- Los precios y el IVA se recalculan en el servidor; no se confía en el carrito del navegador.
- Supabase se usa por conexión directa a Postgres, no con la clave anon.
- Para producción real faltarían pasarela de pago, verificación de correo, recuperación de contraseña, HTTPS propio, límites de tasa y pruebas automatizadas.

## Problemas comunes

**`password authentication failed`**

La contraseña de Supabase está mal o tiene caracteres sin codificar. Codifica `@`, `#`, `/` y similares.

**`ENOTFOUND` o conexión rechazada**

Usa la cadena del Session pooler de Supabase, no la conexión directa, sobre todo si Render no resuelve IPv6.

**`self signed certificate`**

La app ya configura SSL con `rejectUnauthorized: false` para Supabase. Si persiste, revisa que la URL incluya `sslmode=require`.

**`relation "users" does not exist`**

Ejecuta `supabase/schema.sql` en el SQL Editor o reinicia `tienda-web` para que cree las tablas.

**El PDF no descarga**

Revisa `https://tienda-pdf.onrender.com/health` y los logs del servicio. En el plan gratuito puede estar dormido.

**El IVA se calculó localmente**

El microservicio de IVA no respondió a tiempo. La compra se completa igual y la interfaz lo informa.
