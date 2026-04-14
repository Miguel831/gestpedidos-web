# Despliegue seguro con acceso anónimo y sin Firebase Hosting

Este proyecto usa:
- Firebase Authentication en modo **Anonymous**
- Firestore
- Firebase Functions v2
- App Check con **reCAPTCHA v3**
- Twilio WhatsApp

No usa Firebase Hosting. Puedes servir `index.html` desde tu hosting actual, Apache, Nginx o un servidor local.

## 1. Preparar Firebase Console

### 1.1 Activar Authentication anónima
En Firebase Console:
- Authentication
- Sign-in method
- Anonymous
- Enable

### 1.2 Activar App Check para la app web
En Firebase Console:
- App Check
- Registrar la app web
- Elegir **reCAPTCHA v3**
- Copiar la **site key pública**
- Pegarla en `js/config.js` en `reCaptchaV3SiteKey`

Si vas a probar en localhost, también puedes poner un debug token en `appCheckDebugToken`, pero la site key pública sigue siendo obligatoria.

### 1.3 Firestore
Crea Firestore en modo producción si aún no existe.

## 2. Preparar Twilio Sandbox o producción

En Twilio:
- Abre WhatsApp Sandbox o tu sender de producción
- Copia tu `ACCOUNT SID`
- Copia tu `AUTH TOKEN`
- Copia el número/sender de WhatsApp

**Importante**
- En `TWILIO_WHATSAPP_FROM` guarda solo `+14155238886` o tu número aprobado
- No guardes `whatsapp:+14155238886`

## 3. Editar el frontend

Abre `js/config.js` y cambia:

```js
reCaptchaV3SiteKey: 'PON_AQUI_TU_RECAPTCHA_V3_SITE_KEY'
```

por tu site key pública real.

## 4. Terminal paso a paso

Desde la raíz del proyecto:

```bash
npm install -g firebase-tools
firebase login
cd gestpedidos-web
firebase use gestpedidos-web
```

Si `firebase use gestpedidos-web` falla porque el alias no existe, usa:

```bash
firebase use --add
```

Selecciona el proyecto `gestpedidos-web` y asígnalo como `default`.

## 5. Guardar secretos

```bash
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
```

Valores:
- `TWILIO_ACCOUNT_SID` → `AC...`
- `TWILIO_AUTH_TOKEN` → token real de Twilio
- `TWILIO_WHATSAPP_FROM` → `+14155238886` o tu sender aprobado

## 6. Desplegar reglas y funciones

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

No hace falta desplegar hosting.

## 7. Configurar webhook de estado en Twilio

Cuando termine el deploy, Firebase mostrará la URL de `twilioStatusCallback`.
Pégala en Twilio como **Status Callback URL**.

La URL tendrá este formato aproximado:

```txt
https://europe-west1-TU-PROYECTO.cloudfunctions.net/twilioStatusCallback
```

## 8. Servir el frontend sin Firebase Hosting

Opciones válidas:
- tu hosting actual
- Apache/Nginx
- Live Server
- `python3 -m http.server`

Ejemplo local:

```bash
cd gestpedidos-web
python3 -m http.server 8080
```

Después abre:

```txt
http://localhost:8080
```

## 9. Prueba final

1. Abre la app
2. Espera a que conecte con Firebase
3. Escanea o abre un pedido
4. Añade un número en formato internacional, por ejemplo `+34600111222`
5. Pulsa **Enviar WhatsApp**
6. Revisa `whatsapp_logs` en Firestore

## 10. Si falla

### Error de App Check
- revisa `reCaptchaV3SiteKey`
- revisa que el dominio esté autorizado
- en localhost usa debug token si hace falta

### Error de Twilio
- revisa secretos
- revisa que el número receptor haya unido el sandbox con `join <codigo>`
- revisa que sigas dentro de la ventana permitida por Twilio

### Error de permisos Firestore
- vuelve a desplegar reglas

```bash
firebase deploy --only firestore:rules
```

## 11. Seguridad mínima ya incluida

- Twilio en secretos, no en frontend
- Function callable protegida con Auth anónima + App Check
- validación de firma en callback de Twilio
- limitación de frecuencia por usuario
- bloqueo temporal para evitar doble envío del mismo pedido
