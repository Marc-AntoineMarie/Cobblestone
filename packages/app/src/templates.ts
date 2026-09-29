import { isInside, type VaultFolder } from '@cobblestone/core';
import { formatDate } from './settings';

export interface TemplateContext {
  /** Title of the note receiving the template. */
  title: string;
  date?: Date;
  /** Formats for {{date}} and {{time}} without an explicit format. */
  dateFormat?: string;
  timeFormat?: string;
  locale?: string;
}

/**
 * Obsidian's core template variables: {{title}}, {{date}}, {{time}},
 * {{date:FORMAT}} and {{time:FORMAT}} (Moment-style formats).
 */
export function applyTemplate(template: string, context: TemplateContext): string {
  const date = context.date ?? new Date();
  return template.replace(/\{\{\s*(title|date|time)(?::([^}]*))?\s*\}\}/gi, (_match, name: string, format?: string) => {
    const key = name.toLowerCase();
    if (key === 'title') return context.title;
    const fallback = key === 'time' ? (context.timeFormat ?? 'HH:mm') : (context.dateFormat ?? 'YYYY-MM-DD');
    return formatDate(date, format?.trim() || fallback, context.locale);
  });
}

const DEFAULT_NAMES = ['templates', 'template', 'modèles', 'modeles', 'modèle', 'modele'];

/** The templates folder: the configured one, or a folder named "Templates"/"Modèles" (shallowest first). */
export function findTemplatesFolder(configured: string, folders: VaultFolder[]): string | null {
  if (configured) return folders.some((f) => f.path === configured) ? configured : null;
  const candidates = folders
    .filter((f) => DEFAULT_NAMES.includes(f.name.toLowerCase()))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
  return candidates[0]?.path ?? null;
}

/** Markdown notes inside the templates folder, sorted by path. */
export function listTemplates(folder: string, paths: string[]): string[] {
  return paths.filter((p) => p.endsWith('.md') && isInside(p, folder) && p !== folder).sort((a, b) => a.localeCompare(b));
}
