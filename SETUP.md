# CardioAlert — Puesta en marcha

## Estructura

```
CardioAlert/
├── CardioAlertMobile/   App React Native (Polar BLE + inferencia local)
├── backend/             API Express (sesiones, alertas) — Railway
├── ml-api/              API de inferencia del modelo (FastAPI) — Railway
└── supabase/schema.sql  Schema + RLS para ejecutar en Supabase
```

## Lo que tienes que hacer a mano

### 1. Supabase
1. Crear proyecto en supabase.com (tier gratis).
2. SQL Editor → pegar y ejecutar `supabase/schema.sql` completo.
3. Project Settings → API → copiar `Project URL` y las dos llaves.
4. Authentication → Providers → dejar Email habilitado.
5. Crear usuarios de prueba (Authentication → Users → Add user): uno paramédico
   y uno médico. El trigger les crea su fila en `profiles` con rol `paramedico`.
6. Asignar el rol en **Table Editor → profiles → columna `role`**
   (`paramedico`, `medico` o `admin`). Es la única fuente del rol: la usan la app,
   el backend y las políticas de seguridad.

### 2. Variables de entorno
`CardioAlertMobile/.env` (ya creado a partir de `.env.example`):
```
SUPABASE_URL=            # Project URL
SUPABASE_ANON_KEY=       # llave anon/public
API_BASE_URL=            # http://10.0.2.2:3000 en emulador; la URL de Railway en producción
ALERT_CONFIDENCE_THRESHOLD=0.85
```

`backend/.env`:
```
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # llave service_role — NUNCA en la app móvil
```

> Tras editar el `.env` de la app móvil hay que reiniciar Metro con caché limpia:
> `npm start -- --reset-cache`

### 3. Backend en local
```bash
cd backend && npm install && npm run dev
```
Verificar: `curl http://localhost:3000/health`

### 4. Backend en Railway
1. New Project → Deploy from GitHub → seleccionar el repo, root directory `backend`.
2. Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Railway inyecta `PORT`).
3. Copiar la URL pública generada a `API_BASE_URL` del `.env` móvil.

### 5. App Android
Requiere **dispositivo físico con Android 13 o superior** (el Polar SDK 8.x exige minSdk 33).
No hace falta Android Studio: el SDK de línea de comandos ya está en
`/opt/homebrew/share/android-commandlinetools` y las variables están en `~/.zshrc`.

Generar el APK para compartir (queda en `CardioAlert/CardioAlert.apk`):
```bash
cd CardioAlertMobile/android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a && cp app/build/outputs/apk/release/app-release.apk ../../CardioAlert.apk
```
Tras cambiar el `.env` hay que volver a generar el APK: las variables quedan dentro.

Desarrollo en vivo con el teléfono por USB (depuración USB activada):
```bash
cd CardioAlertMobile
npm start                # terminal 1
npm run android          # terminal 2, con el teléfono conectado por USB
```
La primera compilación baja el Polar SDK desde JitPack y tarda varios minutos.

En el teléfono: activar Bluetooth y ubicación, aceptar los permisos que pide la app,
ponerse la banda Polar H10 (humedecer los electrodos), tocar **Buscar Polar H10** →
tocar el dispositivo → **Iniciar monitoreo**. Debe aparecer la onda verde y el BPM.

### 6. Modelo de IA — API de inferencia (opción A)
1. Copia `mejor_modelo_cnn_estable.keras` desde Drive a `ml-api/model/`.
2. Despliega `ml-api` en Railway (root directory `ml-api`); define `ML_API_KEY`.
3. En el `.env` de la app pon `ML_API_URL` y `ML_API_KEY`, y regenera el APK.
   Mientras `ML_API_URL` esté vacío, la app usa el clasificador de demostración.

Detalles en `ml-api/README.md`.

### 7. Modelo TFLite en el celular (opción B, más adelante)
Cuando exportes `modelo.tflite` desde el notebook:
1. `npm install react-native-fast-tflite`
2. Colocar el archivo en `CardioAlertMobile/android/app/src/main/assets/`
3. Conectar en `src/screens/MonitorScreen.tsx`, donde está el `TODO` que ya recibe
   las ventanas de 1250 muestras preprocesadas.

### 7. iOS (después de que Android funcione)
Falta portar `PolarModule.kt` a Swift. El SDK de Polar en iOS se instala vía
CocoaPods (`pod 'PolarBleSdk'`) y hay que añadir `NSBluetoothAlwaysUsageDescription`
al `Info.plist`.

## Lo que ya está hecho

- Módulo nativo Android Kotlin envolviendo el Polar BLE SDK (escaneo, conexión,
  stream de ECG y HR, batería) + puente TypeScript tipado.
- Preprocesamiento de señal: remuestreo 130→250 Hz, pasa-banda 0.5–40 Hz,
  normalización, ventanas de 5 s / 1250 muestras. Con tests (`npx jest`).
- Pantalla de monitoreo con onda ECG en vivo, BPM y contador de ventanas.
- Backend Express con auth por JWT de Supabase, rutas de sesiones,
  clasificaciones y alertas, validación con Zod.
- Schema Postgres con RLS por rol y `alerts` publicada en Realtime.

## Pendiente

- Modelo TFLite + inferencia (bloqueado por el entrenamiento en Colab).
- XAI / heatmap.
- Pantallas de login, historial y confirmación de alerta.
- Monitor hospitalario web.
- Módulo nativo iOS.
