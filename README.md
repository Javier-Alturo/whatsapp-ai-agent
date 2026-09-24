# WhatsApp AI Agent

Agente conversacional de atención al cliente para WhatsApp. Responde en lenguaje natural usando la base de conocimiento del negocio (`knowledge.txt`), agrupa los mensajes seguidos de un mismo cliente antes de contestar, simula escritura humana y escala a una llamada cuando el cliente describe una necesidad concreta.

## Características

- **Conexión directa a WhatsApp** con [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket, sin navegador ni API oficial de pago). La sesión se guarda en `sessions/` y se reconecta sola.
- **Respuestas con LLM** vía el SDK de OpenAI (compatible también con proveedores que exponen la misma API).
- **Base de conocimiento en texto plano:** el contenido de `knowledge.txt` se inyecta en las instrucciones del sistema. Para cambiar lo que sabe el bot, se edita el archivo y se reinicia.
- **Agrupación de mensajes:** espera unos minutos tras el último mensaje del cliente y responde a todo el bloque junto.
- **Anti-bloqueo:** cola de envío, retrasos aleatorios, indicador de "escribiendo" y respuestas cortas en texto plano.
- **Memoria de conversación** por contacto, para no repetir saludos ni perder el hilo.
- **Varias instancias** con `docker-compose` o PM2 (`INSTANCE_NAME`).

## Puesta en marcha

```bash
npm install
cp .env.example .env   # pon tu API key, BUSINESS_NAME y BUSINESS_DESCRIPTION
npm start
```

Escanea el código QR que aparece en la terminal desde WhatsApp → Dispositivos vinculados. Usa un número dedicado al bot, no tu número personal.

### Con Docker

```bash
docker compose up -d
docker compose logs -f
```

## Personalizar

- `knowledge.txt`: catálogo, horarios y políticas del negocio (el que viene es un ejemplo ficticio).
- `index.js`: personalidad, reglas y tiempos de espera del agente.
- `.env`: API key, nombre y descripción del negocio.

## Licencia

MIT
