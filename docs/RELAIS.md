# Installer le relais et l'app web de Cobblestone

Le relais permet à des appareils qui ne sont pas sur le même réseau de se synchroniser (et à l'app
web de se synchroniser tout court). Il ne fait passer que des données **chiffrées de bout en bout**
par les appareils : il ne peut lire aucune note. D'une liaison en cours, il ne garde rien ; pour un
appareil éteint, un autre peut lui **déposer** l'état du coffre scellé pour lui seul, que le relais
garde en mémoire 48 h au plus (`RELAY_STORE_HOURS`, `0` pour désactiver) et qu'il ne peut pas
ouvrir. Détails : [guide/accounts-and-relay.md](guide/accounts-and-relay.md). Le code est dans
`apps/relay/`.

## Sur un VPS, avec un sous-domaine

Le relais tourne dans Docker et n'écoute que sur `127.0.0.1:8787` ; nginx, sur la machine, sert le
sous-domaine en HTTPS et proxifie vers lui.

1. **DNS** : un enregistrement `A` (et `AAAA` en IPv6) pour le sous-domaine, par exemple
   `sync.exemple.fr`, vers l'adresse IP du VPS.
2. **Docker** installé sur le VPS (`curl -fsSL https://get.docker.com | sh`).
3. Lancer le relais :

   ```sh
   git clone https://github.com/Marc-AntoineMarie/Cobblestone.git
   cd Cobblestone/deploy/relay
   docker compose up -d --build
   ```

4. **nginx** : copier `deploy/relay/sync.nginx.conf` dans `/etc/nginx/sites-available/`, y mettre
   son propre nom de domaine, faire le lien dans `sites-enabled/`, puis :

   ```sh
   sudo certbot --nginx -d sync.exemple.fr
   sudo systemctl reload nginx
   ```

5. Vérifier : `https://sync.exemple.fr/health` répond `ok`.
6. Dans Cobblestone : Réglages › Synchronisation › « Adresse du relais » : `sync.exemple.fr`.

Mettre à jour : `git pull` puis la même commande `docker compose up -d --build`.

### Réglages (variables d'environnement, dans `deploy/relay/.env`)

| Variable                                                        | Défaut         | Rôle                                                                                                              |
| --------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PORT`, `HOST`                                                  | 8787 · 0.0.0.0 | Écoute du processus dans le conteneur.                                                                            |
| `DATA_DIR`                                                      | `data`         | Où va `accounts.json` (volume Docker `relay_data`).                                                               |
| `DAILY_CAP_GB`                                                  | 30             | Plafond de trafic par jour et par compte (ou par adresse IP).                                                     |
| `RELAY_STORE_HOURS`                                             | 48             | Durée des dépôts pour un appareil hors ligne ; `0` les désactive.                                                 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | —              | Envoi des codes par e-mail. Sans `SMTP_HOST`, les codes vont dans le journal du conteneur (relais pour soi-même). |

## Si le VPS a déjà un serveur web

C'est le cas par défaut ici : le conteneur ne publie que `127.0.0.1:8787`, donc n'importe quel
serveur web déjà en place peut le proxifier. Il faut un proxy **WebSocket** (nginx : `proxy_pass`
avec les en-têtes `Upgrade` et `Connection`, et des délais longs — voir
`deploy/relay/sync.nginx.conf`).

## Limites

- Un message (une pièce jointe) ne dépasse pas 64 Mo ; 32 connexions par adresse IP ; 64 liaisons et
  64 tags par client.
- Le plafond de trafic quotidien est une protection contre les abus, pas un quota : il n'y a pas de
  quota par compte sur le serveur officiel.

## App web (PWA) — héberger sur le même VPS

L'app web se sert comme un site statique. Le relais reste sur son sous-domaine
(`sync.cobblestone.marc-antoinemarie.com`) et l'app web sur le domaine principal
(`cobblestone.marc-antoinemarie.com`).

1. **DNS** : un enregistrement `A` pour le domaine de l'app.
2. Construire l'app web : `npm run build -w apps/web` (produit `apps/web/dist/`).
3. Copier le contenu de `dist/` dans `/var/www/cobblestone/` sur le VPS.
4. **nginx** : copier `deploy/web/cobblestone.nginx.conf` dans `/etc/nginx/sites-available/`, lien
   dans `sites-enabled/`, puis `sudo certbot --nginx -d cobblestone.marc-antoinemarie.com` et
   `sudo systemctl reload nginx`.
5. Vérifier : `https://cobblestone.marc-antoinemarie.com` charge l'app.

Le workflow `.github/workflows/deploy.yml` fait tout cela à chaque push sur `main` : construction,
`rsync` vers `/var/www/cobblestone/`, puis `git pull` et `docker compose up -d --build` pour le
relais.
