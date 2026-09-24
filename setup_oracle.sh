#!/bin/bash

# Este script instala todo lo necesario para correr el bot en Oracle Cloud (Linux)

echo "==============================================="
echo "  Instalando dependencias para el bot 24/7     "
echo "==============================================="

# 1. Actualizar repositorios e instalar librerías para Puppeteer
echo "Instalando dependencias de Linux..."
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 unzip curl git

# 2. Instalar Node.js (Si no está instalado)
if ! command -v node &> /dev/null
then
    echo "Instalando Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js ya está instalado."
fi

# 3. Instalar PM2 globalmente
echo "Instalando PM2..."
sudo npm install -g pm2

# 4. Instalar las dependencias del bot
echo "Instalando dependencias de NodeJS..."
npm install

echo "==============================================="
echo "  ¡Instalación completa!                       "
echo "==============================================="
echo "Para arrancar tu bot 24/7, ejecuta:"
echo "pm2 start index.js --name whatsapp-bot"
echo "pm2 save"
echo "pm2 startup"
