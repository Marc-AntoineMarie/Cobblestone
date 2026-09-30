import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown';
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { drawSelection, dropCursor, EditorView, keymap, placeholder, type KeyBinding } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { linkCompletion } from './completion';
import { insertWikiLink, toggleTask, toggleWrap } from './commands';
import { editorHost, type EditorHost } from './host';
import { livePreview, sourceDecorations } from './live-preview';
import { obsidianMarkdown, ofmTags } from './ofm-syntax';

/** Token classes; colours live in the stylesheet so both paper stocks theme them. */
const highlight = HighlightStyle.define([
  { tag: t.heading, class: 'tok-heading' },
  { tag: t.emphasis, class: 'tok-em' },
  { tag: t.strong, class: 'tok-strong' },
  { tag: t.strikethrough, class: 'tok-strike' },
  { tag: t.link, class: 'tok-link' },
  { tag: t.url, class: 'tok-url' },
  { tag: t.monospace, class: 'tok-code' },
  { tag: t.quote, class: 'tok-quote' },
  { tag: t.processingInstruction, class: 'tok-mark' },
  { tag: t.contentSeparator, class: 'tok-mark' },
  { tag: ofmTags.tag, class: 'tok-tag' },
  { tag: ofmTags.comment, class: 'tok-comment' },
  { tag: ofmTags.math, class: 'tok-math' },
  { tag: ofmTags.blockId, class: 'tok-meta' },
  { tag: ofmTags.frontmatter, class: 'tok-meta' },
  // Code blocks
  { tag: t.keyword, class: 'tok-keyword' },
  { tag: [t.string, t.special(t.string)], class: 'tok-string' },
  { tag: [t.number, t.bool, t.null, t.atom], class: 'tok-number' },
  { tag: [t.comment, t.lineComment, t.blockComment], class: 'tok-comment' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'tok-function' },
  { tag: [t.typeName, t.className, t.namespace], class: 'tok-type' },
  { tag: [t.propertyName, t.attributeName], class: 'tok-property' },
  { tag: [t.operator, t.punctuation], class: 'tok-punct' },
  { tag: [t.tagName, t.angleBracket], class: 'tok-tagname' },
]);

export type EditorModeName = 'live' | 'source';

export interface EditorOptions {
  host: EditorHost;
  mode: EditorModeName;
  spellcheck: boolean;
  placeholder?: string;
  onChange?: (text: string) => void;
  /** App-level shortcuts (bold, italic...) resolved to editor actions. */
  extraKeys?: KeyBinding[];
}

export const modeCompartment = new Compartment();
export const spellcheckCompartment = new Compartment();

export function modeExtension(mode: EditorModeName): Extension {
  return mode === 'live' ? livePreview() : sourceDecorations();
}

export function spellcheckExtension(on: boolean): Extension {
  return EditorView.contentAttributes.of({ spellcheck: on ? 'true' : 'false', autocorrect: on ? 'on' : 'off' });
}

const formattingKeys: KeyBinding[] = [
  { key: 'Mod-b', run: (v) => toggleWrap(v, '**') },
  { key: 'Mod-i', run: (v) => toggleWrap(v, '*') },
  { key: 'Mod-Shift-h', run: (v) => toggleWrap(v, '==') },
  // Ctrl/Cmd+E is left to the app: it switches between editing and reading, as in Obsidian.
  { key: 'Mod-Shift-x', run: (v) => toggleWrap(v, '~~') },
  { key: 'Mod-l', run: toggleTask },
  { key: 'Mod-Shift-k', run: insertWikiLink },
];

/** Pasted or dropped files become attachments linked where they land. */
function attachments(host: EditorHost): Extension {
  const insertFiles = (view: EditorView, files: File[], pos: number) => {
    void Promise.all(files.map((file) => host.saveAttachment(file))).then((texts) => {
      const insert = texts.join('\n');
      view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
    });
  };
  return EditorView.domEventHandlers({
    paste(event, view) {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return false;
      event.preventDefault();
      insertFiles(view, files, view.state.selection.main.head);
      return true;
    },
    drop(event, view) {
      const files = [...(event.dataTransfer?.files ?? [])];
      if (!files.length) return false;
      event.preventDefault();
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head;
      insertFiles(view, files, pos);
      return true;
    },
  });
}

export function createEditorState(doc: string, options: EditorOptions): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      editorHost.of(options.host),
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      search({ top: true }),
      highlightSelectionMatches(),
      autocompletion({ override: [linkCompletion], icons: false, closeOnBlur: true }),
      markdown({ base: markdownLanguage, codeLanguages: languages, extensions: obsidianMarkdown, addKeymap: false }),
      syntaxHighlighting(highlight),
      EditorView.lineWrapping,
      modeCompartment.of(modeExtension(options.mode)),
      spellcheckCompartment.of(spellcheckExtension(options.spellcheck)),
      attachments(options.host),
      options.placeholder ? placeholder(options.placeholder) : [],
      keymap.of([
        ...(options.extraKeys ?? []),
        ...formattingKeys,
        ...closeBracketsKeymap,
        ...completionKeymap,
        // Tab takes the suggestion too, as in Obsidian (without a list open, it indents).
        { key: 'Tab', run: acceptCompletion },
        ...markdownKeymap,
        ...searchKeymap,
        ...historyKeymap,
        // Ctrl+[ and Ctrl+] are the app's (sidebar, margin); lists indent with Tab.
        ...defaultKeymap.filter((binding) => binding.key !== 'Mod-[' && binding.key !== 'Mod-]'),
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) options.onChange?.(update.state.doc.toString());
      }),
    ],
  });
}
