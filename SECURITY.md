# Sécurité

Cobblestone garde des notes personnelles et, bientôt, les partage et les synchronise : les failles de
sécurité sont traitées en priorité.

## Signaler une faille

**Ne publie pas la faille dans une issue publique.** Signale-la de façon confidentielle via GitHub :
onglet **Security** du dépôt → **Report a vulnerability**.

Indique la version de Cobblestone, le système, les étapes pour reproduire et l'impact estimé.

Tu recevras un accusé de réception sous 7 jours. Une fois la correction publiée, la faille est
décrite dans les notes de version, avec ton nom si tu le souhaites.

## Ce qui compte particulièrement

- Une note ouverte, intégrée ou partagée ne doit jamais pouvoir exécuter de code (HTML et SVG sont
  nettoyés avant affichage).
- L'interface de l'app de bureau n'accède qu'aux dossiers des coffres ouverts dans sa fenêtre.
- Rien ne quitte l'appareil sans action de l'utilisateur.

## Versions maintenues

Seule la dernière version publiée reçoit des correctifs de sécurité.

---

# Security (English)

Please report vulnerabilities privately through GitHub (**Security** tab → **Report a
vulnerability**), not in public issues. Only the latest release receives security fixes.
