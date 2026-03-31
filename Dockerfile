# Estágio 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copia apenas os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia o restante do código e gera o build de produção
COPY . .
RUN npm run build

# Estágio 2: Servidor de Produção (Nginx)
FROM nginx:stable-alpine

# Copia o build gerado no estágio anterior para a pasta do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia uma configuração básica do Nginx para suportar rotas do React (SPA)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]