/*
 * KaTeX is large: it loads the first time a note shows math, with its stylesheet.
 */
type Katex = typeof import('katex').default;

let loader: Promise<Katex> | null = null;

export function loadKatex(): Promise<Katex> {
  loader ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([module]) => module.default);
  return loader;
}

/** Shows the TeX source at once, then the typeset formula when KaTeX is ready. */
export function renderTex(element: HTMLElement, tex: string, displayMode: boolean): void {
  element.textContent = tex;
  element.classList.add('is-pending');
  void loadKatex().then((katex) => {
    try {
      katex.render(tex, element, { displayMode, throwOnError: false, trust: false });
    } catch {
      element.textContent = tex;
    }
    element.classList.remove('is-pending');
  });
}
