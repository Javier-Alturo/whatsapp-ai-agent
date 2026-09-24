import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

const app = express();
let currentQR = '';
let isConnected = false;

app.get('/', async (req, res) => {
    if (isConnected) {
        return res.send('<h1 style="color:green;">¡Vinculado con éxito! Ya puedes cerrar esta ventana y regresar a tu consola.</h1>');
    }
    if (!currentQR) {
         return res.send('<h1>Cargando WhatsApp... por favor espera unos segundos y recarga la página.</h1><script>setTimeout(() => location.reload(), 3000);</script>');
    }
    
    try {
        const qrImage = await qrcode.toDataURL(currentQR);
        res.send(`
            <html>
            <body style="display:flex;flex-direction:column;align-items:center;margin-top:50px;font-family:sans-serif;">
                <h1>Escanea con WhatsApp</h1>
                <p>El código se actualiza solo si caduca.</p>
                <img src="${qrImage}" style="border:1px solid #ccc;border-radius:10px;padding:20px;width:350px;height:350px;"/>
                <script>setTimeout(() => location.reload(), 5000);</script>
            </body>
            </html>
        `);
    } catch (err) {
        res.send('Error renderizando QR');
    }
});

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    currentQR = qr;
    console.log("¡QR Generado! Abre http://localhost:8080 en tu navegador.");
});

client.on('ready', () => {
    console.log("==================================================");
    console.log("¡VINCULACIÓN COMPLETADA CON ÉXITO!");
    console.log("Presiona Ctrl+C para salir.");
    console.log("==================================================");
    isConnected = true;
});

app.listen(8080, () => {
    console.log("Servidor local abierto. Abre http://localhost:8080");
});

client.initialize();
