FROM node:20

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiar solo package.json para evitar conflictos de arquitectura con el lockfile
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Comando de inicio
CMD [ "node", "index.js" ]
