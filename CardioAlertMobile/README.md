# CardioAlert · App móvil

App React Native (sin Expo) con un módulo nativo en Kotlin para el sensor Polar H10.

La configuración, la compilación del APK y el desarrollo en vivo están explicados en el
[README principal](../README.md#6--app-y-apk).

```bash
npm install
cp .env.example .env          # completar
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```
