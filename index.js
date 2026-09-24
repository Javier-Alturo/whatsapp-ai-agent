import fs from 'fs';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

if (!API_KEY) {
    console.error("=========================================");
    console.error("ERROR: No se encontró una API_KEY válida en el archivo .env");
    console.error("=========================================");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: API_KEY });

// Business shown to customers (set BUSINESS_NAME and BUSINESS_DESCRIPTION in .env)
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Tu Negocio';
const BUSINESS_DESCRIPTION = process.env.BUSINESS_DESCRIPTION || 'un negocio que atiende clientes por WhatsApp';

// Load knowledge base
const knowledgeText = fs.readFileSync(path.join(__dirname, 'knowledge.txt'), 'utf8');

const systemInstruction = `Eres un asistente de ventas de WhatsApp que representa a ${BUSINESS_NAME}, ${BUSINESS_DESCRIPTION}. Respondes EN SU NOMBRE, como si fueras él.

Tu personalidad:
- Hablas de forma natural y casual, como una persona joven y profesional
- Eres directo pero amable, sin ser robótico ni formal en exceso
- Usas frases cortas, máximo 2-3 oraciones por mensaje
- No usas listas con bullets ni markdown, solo texto plano conversacional
- A veces usas expresiones como "claro", "perfecto", "con gusto", "cuéntame más"
- Nunca suenas como un chatbot corporativo

Tus servicios (los que ofreces):
- Páginas web y landing pages
- Bots de WhatsApp con IA
- Automatización con n8n, UiPath, Power Automate
- Agentes de inteligencia artificial personalizados
- Procesamiento automático de documentos (PDFs, facturas)
- Integración de APIs y sistemas

Reglas importantes:
- NUNCA des precios ni rangos de precio, siempre di que eso depende del alcance del proyecto y que lo defines una vez entiendas la necesidad
- Si preguntan por precios responde algo como "eso depende del proyecto, cuéntame qué necesitas exactamente y te armo una propuesta"
- Si el cliente describe una necesidad, muestra interés genuino y haz UNA pregunta clave para entender mejor el alcance
- No menciones tecnologías a menos que el cliente pregunte
- Tu objetivo es que el cliente describa bien su problema para luego escalar a una llamada o propuesta formal
- No compartas números de teléfono ni datos personales, todo por este chat
- CRÍTICO: Si es el PRIMER mensaje de la conversación (ej. solo dice "Hola"), NO sueltes de golpe tu lista de servicios. Saluda de forma muy cálida, natural y enfócate en ayudarle a ganar dinero (ej: "¡Hola! ¡Qué gusto que estés aquí! ¿Cómo estás? Un gusto poder ayudarte a escalar y automatizar tu negocio para aumentar tus ingresos. Cuéntame, ¿qué tienes en mente?").
- CRÍTICO: Si el cliente sigue la conversación o te pregunta algo sobre un servicio, NO vuelvas a saludar. Sigue el hilo de la conversación de manera natural y enfocado en su duda.
- CRÍTICO ESCALADA: Cuando el cliente ya describió claramente qué quiere construir o automatizar (por ejemplo, un bot para su restaurante, una página web, un sistema de pedidos, etc.), NO sigas haciendo más preguntas. En ese punto, muestra emoción genuina por el proyecto, valídalo brevemente y propónle agendar una llamada para definir los detalles y arrancar. Ejemplo: "Perfecto, eso está muy bueno y es totalmente posible. Te propongo que agendemos una llamadita corta para definir los detalles y arrancamos. ¿Cuándo tienes un momento libre esta semana?"

Contexto extra (conocimiento):
\${knowledgeText}
`;

const instanceName = process.env.INSTANCE_NAME || 'default';
const sessionDir = path.join(__dirname, `sessions`, `session-${instanceName}`);

// Map to hold timers and buffers per contact (Anti-ban / Burst handling)
const contactBuffers = new Map();

// Map to hold conversation history (Memory)
const chatHistories = new Map();

async function processBufferedMessages(sock, from) {
    const bufferData = contactBuffers.get(from);
    if (!bufferData || bufferData.messages.length === 0) return;

    // Unir todos los mensajes acumulados del usuario en un solo texto
    const combinedMessage = bufferData.messages.join('\\n');
    
    // Guardamos el último mensaje para citarlo en la respuesta
    const lastRawMsg = bufferData.lastRawMsg;

    // Limpiamos el buffer para que futuros mensajes inicien un nuevo ciclo
    contactBuffers.delete(from);

    try {
        // Cargar historial de conversación
        let history = chatHistories.get(from) || [];

        // Limitar a los últimos 6 mensajes para ahorrar tokens y mantener foco
        if (history.length > 6) {
            history = history.slice(history.length - 6);
        }

        const messagesForOpenAI = [
            { role: 'system', content: systemInstruction },
            ...history,
            { role: 'user', content: combinedMessage }
        ];

        console.log(`[Instancia: ${instanceName}] [Procesando Bloque Consolidado] De: ${from} -> \\n"""\\n${combinedMessage}\\n"""`);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messagesForOpenAI,
            temperature: 0.7,
            max_tokens: 150 // Forzar respuestas cortas
        });

        const replyText = response.choices[0].message.content;

        // Actualizar historial con la interacción actual
        history.push({ role: 'user', content: combinedMessage });
        history.push({ role: 'assistant', content: replyText });
        chatHistories.set(from, history);
        
        // Random delay entre 60 y 120 segundos
        const delayMs = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
        // Simular escribiendo los últimos 5 a 10 segundos del delay
        const typingTimeMs = 5000 + Math.floor(Math.random() * 5000); 
        const waitBeforeTyping = delayMs - typingTimeMs;

        console.log(`[Instancia: ${instanceName}] [Espera] Esperando ${Math.floor(delayMs/1000)}s para responder a ${from}...`);
        
        // 1. Espera inicial silenciosa
        await new Promise(resolve => setTimeout(resolve, waitBeforeTyping));
        
        // 2. Activar "escribiendo..." (composing)
        await sock.sendPresenceUpdate('composing', from);
        console.log(`[Instancia: ${instanceName}] [Estado] Escribiendo a ${from}...`);
        await new Promise(resolve => setTimeout(resolve, typingTimeMs));
        
        // 3. Detener "escribiendo..."
        await sock.sendPresenceUpdate('paused', from);

        console.log(`[Instancia: ${instanceName}] [Respuesta Bot] -> ${replyText}`);
        
        // Enviar mensaje real
        await sock.sendMessage(from, { text: replyText }, { quoted: lastRawMsg });

    } catch (error) {
        console.error(`[Instancia: ${instanceName}] Error al procesar bloque de ${from}:`, error);
        if (error.status === 429) {
            console.error(`[Instancia: ${instanceName}] Alerta: Superaste el límite de cuota o saldo de tu API Key.`);
        }
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['TechBot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`[Instancia: ${instanceName}] Escanea el código QR en la terminal para iniciar sesión:`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[Instancia: ${instanceName}] Conexión cerrada. Reconectando: ${shouldReconnect}`);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log(`[Instancia: ${instanceName}] Se cerró sesión. Borra la carpeta "sessions/session-${instanceName}" para escanear de nuevo.`);
            }
        } else if (connection === 'open') {
            console.log('=========================================');
            console.log(`¡Bot [${instanceName}] conectado y listo para recibir mensajes!`);
            console.log('=========================================');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        
        // Ignorar mensajes propios
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        
        // Ignorar estados y mensajes de grupos (Anti-ban preventivo)
        if (from === 'status@broadcast' || from.includes('@g.us')) return;

        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
        
        if (!messageContent) return;

        console.log(`[Instancia: ${instanceName}] [Mensaje En Buffer] De: ${from} -> ${messageContent}`);

        let bufferData = contactBuffers.get(from);
        
        if (bufferData) {
            // Si ya existe un timer, lo cancelamos para reiniciar la cuenta
            clearTimeout(bufferData.timer);
            bufferData.messages.push(messageContent);
            bufferData.lastRawMsg = msg; // Actualizamos para citar el último mensaje
        } else {
            // Si no existe, creamos el buffer inicial
            bufferData = {
                messages: [messageContent],
                lastRawMsg: msg,
                timer: null
            };
            contactBuffers.set(from, bufferData);
        }

        console.log(`[Instancia: ${instanceName}] [Timer] Timer reiniciado a 3 minutos para ${from}`);

        // Iniciar el timer de 3 minutos (180,000 milisegundos)
        bufferData.timer = setTimeout(() => {
            processBufferedMessages(sock, from);
        }, 180000); 
    });
}

console.log(`Iniciando bot [Instancia: ${instanceName}]...`);
connectToWhatsApp();
