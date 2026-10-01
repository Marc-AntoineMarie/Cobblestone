// Versions de test (workflow « Version de test ») : la configuration d'electron-builder.yml, mais les
// apps se mettent à jour depuis la pré-version fixe main-latest, toujours la plus récente.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const config = yaml.load(readFileSync(path.join(__dirname, 'electron-builder.yml'), 'utf8'));
const repository = process.env.GITHUB_REPOSITORY ?? 'Marc-AntoineMarie/Cobblestone';
config.publish = { provider: 'generic', url: `https://github.com/${repository}/releases/download/main-latest` };
module.exports = config;
