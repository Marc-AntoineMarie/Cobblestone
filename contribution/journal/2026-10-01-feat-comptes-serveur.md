---
date: 2026-10-01
branche: feat/comptes-serveur
type: nouveauté
version: non publiée
---

# Les comptes, côté serveur

## Pourquoi

Que n'importe qui retrouve ses coffres d'un appareil à l'autre, où qu'il soit, sans que le serveur de
l'utilisateur serve à autre chose. Première étape : les comptes sur le serveur.

## Ajouté

- Comptes (fichier JSON dans un volume, écrit atomiquement) : inscription par e-mail et mot de passe
  (10 caractères au moins), code de vérification par e-mail, connexion par appareil, mot de passe
  oublié (déconnecte tout), liste et déconnexion des appareils, suppression du compte.
- Sécurité : scrypt pour les mots de passe, SHA-256 pour les jetons et les codes (jamais en clair),
  codes valables 15 min et 5 essais, échecs répétés ralentis par adresse et par compte, réponses
  identiques pour une adresse inconnue.
- Relais : un appareil se présente avec son jeton ; l'étiquette « account » ne réunit que les
  appareils du même compte. Plafond contre les abus (30 Go par jour), pas de quotas.
- E-mails par Brevo (SMTP), `.env.example`, volume de données ; docs/RELAIS.md.

## Modifié

- IDEES : pas de quotas pour l'instant, à revoir avec beaucoup d'utilisateurs.

## Supprimé

Rien.

## Tests

- `accounts.test.ts` : inscription et connexion, rien en clair dans le fichier, mots de passe faibles,
  adresse prise, ralentissement, nouveau mot de passe, redémarrage, API HTTP et étiquette de compte.
  Image Docker lancée, inscription par l'API. Recette 31.19 repassée.

## Fichiers

- modifié : `.gitignore`
- modifié : `apps/relay/Dockerfile`
- modifié : `apps/relay/package.json`
- ajouté : `apps/relay/src/accounts.test.ts`
- ajouté : `apps/relay/src/accounts.ts`
- ajouté : `apps/relay/src/api.ts`
- ajouté : `apps/relay/src/mail.ts`
- modifié : `apps/relay/src/main.ts`
- modifié : `apps/relay/src/relay.ts`
- modifié : `apps/relay/tsconfig.json`
- modifié : `contribution/IDEES.md`
- modifié : `deploy/relay/docker-compose.yml`
- modifié : `docs/RELAIS.md`
- modifié : `package-lock.json`
- modifié : `tests/tsconfig.json`

## Commits

- `8331a47` feat(comptes): comptes par e-mail et mot de passe sur le serveur
- `08509d6` feat(relais): les appareils d'un compte se retrouvent entre eux, plafond contre les abus
- `716bc96` docs(relais): comptes, e-mails par Brevo et données sur le serveur
