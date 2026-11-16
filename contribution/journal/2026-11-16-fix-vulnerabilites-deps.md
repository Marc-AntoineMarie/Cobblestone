---
date: 2026-11-16
branche: fix/vulnerabilites-deps
type: correction
version: non publiée
---

# Corriger les vulnérabilités des dépendances

## Pourquoi

La CI (`npm audit --omit=dev --audit-level=high`) échouait : dompurify critique, markdown-it haute, nodemailer modérée.

## Modifié

- `dompurify` 3.4.x → 3.5.x (critique : bypass SAFE_FOR_TEMPLATES, shadow root, SMIL href).
- `markdown-it` 15.0.2 → 15.0.3 (haute : DoS quadratique sur HTML inline et link ref).
- `nodemailer` 10.0.x → 10.6.0 (modérée : parsing d'adresses).

## Supprimé

Rien.

## Tests

`npm audit --omit=dev --audit-level=high` passe (reste katex/mermaid basse, non corrigeable).

## Fichiers

- modifié : `apps/relay/package.json`
- modifié : `package-lock.json`
- modifié : `packages/app/package.json`

## Commits

- `ec0f0bc` fix(deps): corriger les vulnérabilités dompurify, markdown-it, nodemailer
