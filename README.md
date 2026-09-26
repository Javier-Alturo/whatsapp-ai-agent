# WhatsApp AI Agent

A customer-service agent for WhatsApp. It answers in natural language using the business's knowledge base (`knowledge.txt`), groups a customer's back-to-back messages before replying, types like a person and escalates to a phone call when the customer describes a concrete need.

## Features

- **Direct WhatsApp connection** with [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket, no browser and no paid official API). The session is saved in `sessions/` and reconnects on its own.
- **LLM replies** through the OpenAI SDK (also works with any provider that exposes the same API).
- **Plain-text knowledge base:** the content of `knowledge.txt` goes into the system instructions. To change what the bot knows, edit the file and restart.
- **Message grouping:** waits a few minutes after the customer's last message and answers the whole block at once.
- **Anti-ban measures:** send queue, random delays, "typing…" indicator and short plain-text replies.
- **Conversation memory** per contact, so it doesn't repeat greetings or lose the thread.
- **Several instances** with `docker-compose` or PM2 (`INSTANCE_NAME`).

> **Note:** Baileys is an unofficial WhatsApp client, and WhatsApp can ban numbers that use it. For a real business, use the official [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).

## Getting started

```bash
npm install
cp .env.example .env   # add your API key, BUSINESS_NAME and BUSINESS_DESCRIPTION
npm start
```

Scan the QR code shown in the terminal from WhatsApp → Linked devices. Use a number dedicated to the bot, not your personal number.

### With Docker

```bash
docker compose up -d
docker compose logs -f
```

## Customize

- `knowledge.txt`: the business's catalog, hours and policies (the included one is a fictional example).
- `index.js`: the agent's personality, rules and wait times.
- `.env`: API key, business name and description.

## License

MIT
