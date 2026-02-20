# 🚀 Migración a Supabase — Instrucciones

## Paso 1: Crear proyecto en Supabase
1. Ve a https://app.supabase.com y crea una cuenta
2. Crea un **nuevo proyecto** (elige una región cercana)
3. Espera a que el proyecto se configure (~2 minutos)

## Paso 2: Obtener las credenciales
1. En tu proyecto Supabase → **Settings** → **API**
2. Copia:
   - **Project URL** → `https://xxxxxxxx.supabase.co`
   - **anon public key** → la clave larga que empieza con `eyJ...`

## Paso 3: Configurar el proyecto
Abre el archivo `src/supabase/config.js` y reemplaza:
```js
const SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co'; // ← tu URL
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';              // ← tu key
```

## Paso 4: Crear las tablas en Supabase
1. Ve a **SQL Editor** en tu dashboard de Supabase
2. Haz clic en **New Query**
3. Pega todo el contenido del archivo `SUPABASE_SETUP.sql`
4. Haz clic en **Run** ▶️

## Paso 5: Instalar dependencias y ejecutar
```bash
npm install
npm start
```

## Paso 6: Desactivar confirmación de email (opcional para desarrollo)
- Supabase Dashboard → **Authentication** → **Email**
- Desactiva "Confirm email" para que los usuarios puedan logearse sin confirmar

---

## Estructura de tablas creadas:
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil del usuario (nombre, foto) |
| `gmail_accounts` | Cuentas Gmail encriptadas |
| `other_accounts` | Otras cuentas (Netflix, Instagram, etc.) |
| `bank_data` | Datos bancarios encriptados |

## Storage bucket:
- **`avatars`** → almacena las fotos de perfil
- Las fotos se guardan como `{user_id}/avatar_{timestamp}.ext`
- Se reflejan automáticamente en el header del dashboard
