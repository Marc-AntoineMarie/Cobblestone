# Installer le relais et l'app web de Cobblestone

Le relais permet à des appareils qui ne sont pas sur le même réseau de se synchroniser (et à l'app web
de se synchroniser tout court). Il ne fait passer que des données **chiffrées de bout en bout** par les
appareils : il ne peut lire aucune note, et ne garde rien. Le code est dans `apps/relay/`.

## Sur un VPS, avec un sous-domaine

1. **DNS** : un enregistrement `A` (et `AAAA` en IPv6) pour le sous-domaine, par exemple
   `sync.exemple.fr`, vers l'adresse IP du VPS.
2. **Docker** installé sur le VPS (`curl -fsSL https://get.docker.com | sh`).
3. Sur le VPS :

   ```sh
   git clone https://github.com/Marc-AntoineMarie/Cobblestone.git
   cd Cobblestone/deploy/relay
   RELAY_DOMAIN=sync.exemple.fr docker compose up -d --build
   ```

   Caddy obtient le certificat HTTPS tout seul (les ports 80 et 443 doivent être libres et ouverts).

4. Vérifier : `https://sync.exemple.fr/health` répond `ok`.
5. Dans Cobblestone : Réglages › Synchronisation › « Adresse du relais » : `sync.exemple.fr`.

Mettre à jour : `git pull` puis la même commande `docker compose up -d --build`.

## Si le VPS a déjà un serveur web (nginx, Apache…)

Ne lancer que le relais (`docker compose up -d --build relay`, en publiant son port :
`ports: ['127.0.0.1:8787:8787']`), et ajouter au serveur existant un proxy WebSocket vers
`127.0.0.1:8787` pour le sous-domaine (nginx : `proxy_pass`, avec les en-têtes `Upgrade` et
`Connection`).

## Limites

- Un message (une pièce jointe) ne dépasse pas 64 Mo ; 32 connexions par adresse IP.
- Le relais ne garde rien : deux appareils échangent quand ils sont connectés en même temps.

## App web (PWA) — héberger sur le même VPS

L'app web se sert comme un site statique depuis `deploy/web/`. Le relais reste sur son sous-domaine
(`sync.cobblestone.marc-antoinemarie.com`) et l'app web sur le domaine principal
(`cobblestone.marc-antoinemarie.com`).

1. **DNS** : un enregistrement `A` pour le domaine de l'app (déjà pointé vers le VPS).
2. Construire l'app web localement : `npm run build -w apps/web` (produit `apps/web/dist/`).
3. Copier le dossier `dist/` dans `deploy/web/dist/` sur le VPS.
4. Sur le VPS (dans `deploy/web/`) :

   ```sh
   WEB_DOMAIN=cobblestone.marc-antoinemarie.com docker compose up -d
   ```

   Caddy obtient le certificat HTTPS automatiquement.

5. Vérifier : `https://cobblestone.marc-antoinemarie.com` charge l'app.

Mettre à jour : reconstruire, recopier le `dist/`, puis `docker compose restart web`.
