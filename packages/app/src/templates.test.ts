import { describe, expect, it } from 'vitest';
import { applyTemplate, findTemplatesFolder, listTemplates } from './templates';

const folder = (path: string) => ({ path, name: path.split('/').pop()!, parent: path.split('/').slice(0, -1).join('/') });

describe('templates', () => {
  const date = new Date(2026, 8, 29, 14, 5);

  it('fills Obsidian template variables', () => {
    const text = '# {{title}}\nCreated {{date}} at {{time}}\nWeek {{date:YYYY-[W]MM}} · {{ TIME:HH }}h';
    expect(applyTemplate(text, { title: 'Plan', date })).toBe('# Plan\nCreated 2026-09-29 at 14:05\nWeek 2026-W09 · 14h');
  });

  it('uses the configured default formats', () => {
    expect(applyTemplate('{{date}} {{time}}', { title: '', date, dateFormat: 'DD/MM/YYYY', timeFormat: 'HH[h]mm' })).toBe(
      '29/09/2026 14h05',
    );
  });

  it('finds the templates folder', () => {
    const folders = [folder('Notes'), folder('Archive/Templates'), folder('Modèles')];
    expect(findTemplatesFolder('', folders)).toBe('Modèles');
    expect(findTemplatesFolder('Archive/Templates', folders)).toBe('Archive/Templates');
    expect(findTemplatesFolder('Gone', folders)).toBeNull();
    expect(findTemplatesFolder('', [folder('Notes')])).toBeNull();
  });

  it('lists notes inside the folder only', () => {
    expect(listTemplates('Modèles', ['Modèles/Jour.md', 'Modèles/img.png', 'Notes/A.md', 'Modèles/Sub/Réunion.md'])).toEqual([
      'Modèles/Jour.md',
      'Modèles/Sub/Réunion.md',
    ]);
  });
});
