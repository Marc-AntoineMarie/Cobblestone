# Le relais de Cobblestone. Construire depuis la racine du dépôt :
#   docker build -f apps/relay/Dockerfile -t cobblestone-relay .
FROM node:24-alpine
WORKDIR /app
COPY apps/relay/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY apps/relay/src/main.ts apps/relay/src/relay.ts ./src/
ENV PORT=8787
EXPOSE 8787
USER node
CMD ["node", "src/main.ts"]
