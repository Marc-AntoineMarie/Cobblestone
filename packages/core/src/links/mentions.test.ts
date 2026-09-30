import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown/parse';
import { findUnlinkedMentions } from './mentions';

const mentions = (text: string, names: string[]) => findUnlinkedMentions(text, parseMarkdown(text), names).map((m) => m.text);

describe('unlinked mentions', () => {
  it('finds whole-word mentions in any case', () => {
    expect(mentions('The project plan is ready. Project Plans differ. See PROJECT PLAN.', ['Project Plan'])).toEqual([
      'project plan',
      'PROJECT PLAN',
    ]);
  });

  it('ignores links, code, comments and properties', () => {
    const text =
      '---\nsubject: Garden\n---\n[[Garden]] and [the garden](Garden.md) `garden` %% garden %%\n```\ngarden\n```\nour garden';
    expect(mentions(text, ['Garden'])).toEqual(['garden']);
  });

  it('matches aliases and prefers the longest name', () => {
    expect(mentions('Jardin partagé et jardin', ['Jardin', 'Jardin partagé'])).toEqual(['Jardin partagé', 'jardin']);
  });

  it('handles accents and punctuation at word edges', () => {
    expect(mentions('(Étude) études étude.', ['étude'])).toEqual(['Étude', 'étude']);
  });

  it('reports lines', () => {
    const [m] = findUnlinkedMentions('a\nb Plan', parseMarkdown('a\nb Plan'), ['plan']);
    expect(m).toMatchObject({ line: 1, from: 4, to: 8 });
  });
  it('does not count names inside links or web addresses', () => {
    const text = 'Un [lien](https://x.org/Étude), [Étude ici](Autre.md) et https://site.fr/Étude/page.';
    expect(findUnlinkedMentions(text, parseMarkdown(text), ['Étude'])).toEqual([]);
  });
});
