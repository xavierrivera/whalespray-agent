# Integración WhatsApp — Guía de instalación

## Arquitectura

```
Teléfono WhatsApp (pruebas)
         ↓ escanea QR
      open-wa
    (Docker / Railway)
         ↓ webhook POST
   Backend FastAPI
   (Railway existente)
    RAG + LLaMA 3.3 (Groq)
         ↓ respuesta
      open-wa → WhatsApp
```

---

## Opción A: Pruebas en local (más rápido)

### Requisitos
- Docker Desktop instalado
- El backend corriendo en Railway (o local en puerto 8000)
- Un teléfono con WhatsApp para escanear el QR

### Pasos

**1. Crea el archivo de variables de entorno**
```bash
cp .env.whatsapp.example .env.whatsapp
# Edita .env.whatsapp con tus claves reales
```

**2. Arranca open-wa**
```bash
docker compose -f docker-compose.whatsapp.yml up openwa -d
```

**3. Escanea el QR**
- Abre http://localhost:2785 en el navegador
- Verás un código QR
- En WhatsApp del teléfono de pruebas: Configuración → Dispositivos vinculados → Vincular dispositivo
- Escanea el QR

**4. Configura el webhook en open-wa**
- En el panel (http://localhost:2785), ve a Settings → Webhooks
- Añade la URL del backend:
  - Local: `http://host.docker.internal:8000/webhook/whatsapp`
  - Railway: `https://tu-backend.railway.app/webhook/whatsapp`

**5. Añade las variables al backend (Railway)**

En Railway → tu servicio backend → Variables:
```
OPENWA_URL=https://tu-openwa.railway.app
OPENWA_API_KEY=mi_clave_secreta_openwa
OPENWA_SESSION_ID=whalespray-bot
```

**6. Prueba**
- Envía un WhatsApp al número vinculado
- El agente responderá automáticamente

---

## Opción B: Despliegue de open-wa en Railway

### Pasos

**1. Crea un nuevo servicio en Railway**
- New Project → Deploy from Docker image
- Imagen: `openwa/wa-automate:latest`

**2. Variables de entorno en Railway (servicio open-wa)**
```
SESSION_ID=whalespray-bot
WEBHOOK_URL=https://tu-backend.railway.app/webhook/whatsapp
API_KEY=mi_clave_secreta_openwa
KEEP_ALIVE=true
HEADLESS=true
```

**3. Volumen persistente**
- En Railway → Add Volume → Mount path: `/app/.wwebjs_auth`
- Esto guarda la sesión para no tener que escanear el QR cada vez

**4. Exponer el puerto**
- Port: `2785`
- Railway generará una URL pública tipo `https://openwa-xxx.railway.app`

**5. Escanea el QR**
- Abre `https://openwa-xxx.railway.app` en el navegador
- Escanea el QR con el teléfono de pruebas

**6. Actualiza las variables del backend (Railway)**
```
OPENWA_URL=https://openwa-xxx.railway.app
OPENWA_API_KEY=mi_clave_secreta_openwa
OPENWA_SESSION_ID=whalespray-bot
```

---

## Endpoint añadido al backend

```
POST /webhook/whatsapp
```

- Recibe mensajes de open-wa
- Procesa con RAG + LLaMA 3.3
- Guarda la conversación en SQLite (visible en el panel Admin)
- Responde vía API de open-wa
- Ignora mensajes de grupos y eventos que no sean texto

Cada número de WhatsApp tiene su propia sesión de conversación,
visible en el panel de Conversaciones del admin.

---

## Notas importantes

- Usa un número de prueba, **no el número oficial de Whalespray**
- WhatsApp puede bloquear números que envían muchos mensajes automáticos
- Para producción, migra a la **WhatsApp Business API oficial** (Meta/Twilio)
