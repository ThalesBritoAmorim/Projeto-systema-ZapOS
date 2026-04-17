# Estágio de construção (Build Stage)
FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependências para compilar better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Build do frontend e do backend
RUN npm run build

# Estágio final (Production Stage)
FROM node:22-slim

WORKDIR /app

# Instalar dependências de runtime para better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# Movemos o server.js buildado para a raiz para manter a compatibilidade de caminhos
COPY --from=builder /app/dist-server/server.js ./server.js
COPY --from=builder /app/.env.example ./.env

# Instala apenas dependências de produção
RUN npm install --omit=dev

EXPOSE 3000

ENV NODE_ENV=production

# Rodar o servidor JS puro
CMD ["node", "server.js"]
