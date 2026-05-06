# ─── FASE 1: instalar dependencias ──────────────────────────
# Usamos alpine porque es una imagen muy ligera (5MB vs 900MB)
FROM node:22-alpine AS deps
WORKDIR /app

# Copiamos solo los package.json primero
# Si no cambian, Docker reutiliza esta capa en la siguiente build
# y no reinstala todo — mucho más rápido
COPY package*.json ./
RUN npm ci --omit=dev

# ─── FASE 2: imagen final ────────────────────────────────────
# Partimos de una imagen limpia — sin las herramientas de build
FROM node:22-alpine AS runner
WORKDIR /app

# Copiamos las dependencias ya instaladas de la fase anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiamos el código fuente
COPY src ./src
COPY package.json ./

# Puerto que usa la app
EXPOSE 3001

# Comando para arrancar
CMD ["node", "src/index.js"]