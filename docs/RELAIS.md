# Installer le relais de Cobblestone

Le relais permet à des appareils qui ne sont pas sur le même réseau de se synchroniser (et à l'app web
de se synchroniser tout court). Il ne fait passer que des données **chiffrées de bout en bout** par les
appareils : il ne peut lire aucune note, et ne garde rien. Le code est dans `apps/relay/`.

## Sur un VPS, avec un sous-domaine

1. **DNS** : un enregistrement `A` (et `AAAA` en IPv6) pour le sous-domaine, par exemple
   `sync.exemple.fr`, vers l'adresse IP du VPS.
2. **Docker** installé sur le VPS (`curl -fsSL https://get.docker.com | sh`).
3. Le relais, qui écoute seulement sur la machine (`127.0.0.1:8787`) :

   ```sh
   git clone https://github.com/Marc-AntoineMarie/Cobblestone.git
   cd Cobblestone/deploy/relay
   docker compose up -d --build
   curl http://127.0.0.1:8787/health   # → ok
   ```

4. Le HTTPS, selon ce qui tourne déjà sur le VPS (`sudo ss -ltnp | grep -E ':(80|443) '` le dit) :
   - **nginx** : le bloc ci-dessous, puis le certificat avec `sudo certbot --nginx -d sync.exemple.fr` ;
   - **rien** (ports 80 et 443 libres) : `RELAY_DOMAIN=sync.exemple.fr docker compose --profile caddy up -d`,
     Caddy obtient le certificat seul.

   ```nginx
   server {
       listen 80;
       server_name sync.exemple.fr;
       location / {
           proxy_pass http://127.0.0.1:8787;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $remote_addr;
           proxy_read_timeout 1h;
       }
   }
   ```

   (dans `/etc/nginx/sites-available/cobblestone-relay`, lien dans `sites-enabled`, puis
   `sudo nginx -t && sudo systemctl reload nginx`).

5. Vérifier : `https://sync.exemple.fr/health` répond `ok`.
6. Dans Cobblestone : Réglages › Synchronisation › « Adresse du relais » : `sync.exemple.fr`.

Mettre à jour : `git pull` puis `docker compose up -d --build`.

## Comptes et e-mails (Brevo)

Les comptes envoient un code par e-mail (activation, mot de passe oublié). Avec Brevo (gratuit,
300 e-mails par jour) :

1. Créer un compte sur brevo.com.
2. **Expéditeurs, domaines** : ajouter le domaine (`marc-antoinemarie.com`) et copier chez le
   registrar les enregistrements DNS qu'il donne (DKIM, et SPF/DMARC s'il les demande) ; attendre la
   vérification.
3. **SMTP & API › SMTP** : générer une clé SMTP.
4. Sur le VPS, dans `deploy/relay` : `cp .env.example .env`, remplir `SMTP_USER`, `SMTP_PASS`
   (la clé) et `MAIL_FROM`, puis `docker compose up -d --build`.

Sans `.env`, les codes s'écrivent dans `docker compose logs relay` (pratique pour essayer).

Les comptes sont dans le volume `relay_data` (`accounts.json`) : mots de passe en empreinte scrypt,
jetons de session et codes en empreinte SHA-256, jamais en clair. À sauvegarder comme toute donnée.

## Limites

- Un message (une pièce jointe) ne dépasse pas 64 Mo ; 32 connexions par adresse IP.
- Plafond contre les abus : 30 Go par jour et par compte (ou par adresse IP sans compte), réglable
  (`DAILY_CAP_GB`). Pas de quotas sinon.
- Le relais ne garde rien : deux appareils échangent quand ils sont connectés en même temps.
