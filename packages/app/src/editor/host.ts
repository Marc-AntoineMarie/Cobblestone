import { Facet } from '@codemirror/state';

/** What the editor needs from the app: link resolution, navigation, attachments, completions. */
export interface EditorHost {
  /** Vault path of the note being edited. */
  sourcePath(): string;
  /** Resolves a link target ("Note", "Folder/Note.md", "img.png") to a vault path. */
  resolve(target: string): string | null;
  /** Follows a link target ("Note#Heading"). */
  openLink(target: string, options: { newTab: boolean }): void;
  openTag(tag: string): void;
  /** Shows the hover preview of a link target next to `anchor`, or hides it. */
  previewLink(target: string, anchor: Element): void;
  endPreview(): void;
  openExternal(url: string): void;
  /** Object URL for an attachment, for images, audio, video and PDFs. */
  resourceUrl(path: string): Promise<string>;
  /** Renders an embedded note section into `container`; returns a cleanup function. */
  renderEmbed(container: HTMLElement, target: string, display: string | null): () => void;
  /** Link completion candidates. */
  linkCandidates(): { path: string; name: string; aliases: string[] }[];
  headings(path: string): { text: string; level: number }[];
  blockIds(path: string): { id: string; text: string }[];
  tags(): string[];
  /** Shortest link text for a path, as a wikilink target. */
  linkText(path: string): string;
  /** Saves a pasted or dropped file; returns the text to insert. */
  saveAttachment(file: File): Promise<string>;
}

export const editorHost = Facet.define<EditorHost, EditorHost | null>({
  combine: (values) => values[0] ?? null,
});
