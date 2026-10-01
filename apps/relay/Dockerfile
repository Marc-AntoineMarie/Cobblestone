# Le relais de Cobblestone. Construire depuis la racine du dépôt :
#   docker build -f apps/relay/Dockerfile -t cobblestone-relay .
FROM node:24-alpine
WORKDIR /app
COPY apps/relay/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY apps/relay/src/main.ts apps/relay/src/relay.ts apps/relay/src/accounts.ts apps/relay/src/api.ts apps/relay/src/mail.ts ./src/
# Comptes : un fichier dans un volume, lisible par le seul utilisateur du relais.
RUN mkdir -p data && chown node:node data
ENV DATA_DIR=/app/data
ENV PORT=8787
EXPOSE 8787
USER node
CMD ["node", "src/main.ts"]
