import { mkdirSync, writeFileSync } from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { parseRecette } from '../../../scripts/lib/recette-md.mjs';

type Outcome = 'réussi' | 'échoué' | 'ci' | 'manuel' | 'à automatiser' | 'ignoré';

/**
 * Writes the state of the checklist after a run: test-results/recette.md for
 * people, test-results/recette.json for tools. Each line says, per platform,
 * whether the check passed, failed, is manual or not automated yet.
 */
export default class RecetteReport implements Reporter {
  private outcomes = new Map<string, Record<string, { outcome: Outcome; detail?: string }>>();

  onTestEnd(test: TestCase, result: TestResult) {
    const id = test.title.split(' · ')[0]!;
    const project = test.parent.project()?.name ?? '?';
    const kind = test.annotations.find((a) => a.type === 'recette')?.description;
    let outcome: Outcome;
    let detail: string | undefined;
    if (kind === 'manuel') {
      outcome = 'manuel';
      detail = test.annotations.find((a) => a.type === 'manuel')?.description;
    } else if (kind === 'ci') {
      outcome = 'ci';
      detail = test.annotations.find((a) => a.type === 'ci')?.description;
    } else if (kind === 'à automatiser') outcome = 'à automatiser';
    else if (result.status === 'passed') outcome = 'réussi';
    else if (result.status === 'skipped') outcome = 'ignoré';
    else {
      outcome = 'échoué';
      detail = result.error?.message
        ?.split('\n')
        .find((l) => l.trim())
        ?.replace(/\u001b\[[0-9;]*m/g, '');
    }
    const byProject = this.outcomes.get(id) ?? {};
    // A retried test keeps its last result.
    byProject[project] = { outcome, detail };
    this.outcomes.set(id, byProject);
  }

  onEnd(result: FullResult) {
    const { sections } = parseRecette();
    const count: Record<Outcome, number> = { réussi: 0, échoué: 0, ci: 0, manuel: 0, 'à automatiser': 0, ignoré: 0 };
    const mark = (o?: Outcome) => (o === 'réussi' ? '✓' : o === 'échoué' ? '✗ échoué' : (o ?? '—'));
    const lines = [
      '# Recette automatique',
      '',
      `Exécution du ${new Date().toLocaleString('fr-FR')} : ${result.status === 'passed' ? 'tout est passé' : 'des vérifications ont échoué'}.`,
      '',
    ];
    const failures: string[] = [];
    for (const section of sections) {
      lines.push(`## ${section.id}. ${section.title}`, '', '| Test | Bureau | Web |', '| ---- | ------ | --- |');
      for (const t of section.tests) {
        const byProject = this.outcomes.get(t.id) ?? {};
        for (const p of t.where) {
          const o = byProject[p];
          if (o) count[o.outcome]++;
          if (o?.outcome === 'échoué') failures.push(`- **${t.id}** (${p}) : ${o.detail ?? ''}`);
        }
        const cell = (p: string) => (t.where.includes(p) ? mark(byProject[p]?.outcome) : '');
        lines.push(`| ${t.id} ${t.action.replace(/\|/g, '\\|')} | ${cell('bureau')} | ${cell('web')} |`);
      }
      lines.push('');
    }
    if (failures.length) lines.splice(4, 0, '## Échecs', '', ...failures, '');
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/recette.md', lines.join('\n'));
    writeFileSync('test-results/recette.json', JSON.stringify(Object.fromEntries(this.outcomes), null, 2));
    console.log(
      `\nRecette : ${count.réussi} réussis, ${count.échoué} échoués, ${count.ci} par la CI, ${count.manuel} manuels, ${count['à automatiser']} à automatiser.` +
        '\nDétail : test-results/recette.md',
    );
  }
}
