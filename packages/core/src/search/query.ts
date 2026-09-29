/*
 * Search query language, compatible with Obsidian's:
 *   word "exact phrase" /regex/ -excluded  a OR b  (grouping)
 *   file: path: content: tag: line:(...) block:(...) section:(...)
 *   task: task-todo: task-done: match-case: ignore-case:
 *   [property] [property:value]
 * Terms separated by spaces are ANDed.
 */

export type Matcher = { kind: 'text'; value: string; exact: boolean } | { kind: 'regex'; regex: RegExp };

export type QueryNode =
  | { type: 'and'; children: QueryNode[] }
  | { type: 'or'; children: QueryNode[] }
  | { type: 'not'; child: QueryNode }
  | { type: 'term'; field: Field; matcher: Matcher; caseSensitive: boolean }
  | { type: 'scoped'; scope: 'line' | 'block' | 'section' | 'task' | 'task-todo' | 'task-done'; child: QueryNode }
  | { type: 'property'; name: string; value: QueryNode | null };

export type Field = 'any' | 'file' | 'path' | 'content' | 'tag';

const FIELDS = new Set(['file', 'path', 'content', 'tag']);
const SCOPES = new Set(['line', 'block', 'section', 'task', 'task-todo', 'task-done']);

type Token =
  | { t: 'word'; value: string; quoted: boolean; regex: boolean }
  | { t: 'op'; value: '(' | ')' | '-' | 'OR' }
  | { t: 'prefix'; value: string }
  | { t: 'prop'; name: string; value: string | null };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '(' || c === ')') {
      tokens.push({ t: 'op', value: c });
      i++;
      continue;
    }
    if (c === '-' && i + 1 < input.length && !/\s/.test(input[i + 1]!)) {
      tokens.push({ t: 'op', value: '-' });
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let value = '';
      while (j < input.length && input[j] !== '"') {
        if (input[j] === '\\' && j + 1 < input.length) j++;
        value += input[j];
        j++;
      }
      tokens.push({ t: 'word', value, quoted: true, regex: false });
      i = j + 1;
      continue;
    }
    if (c === '/') {
      let j = i + 1;
      let value = '';
      while (j < input.length && input[j] !== '/') {
        if (input[j] === '\\' && input[j + 1] === '/') {
          value += '/';
          j += 2;
          continue;
        }
        value += input[j];
        j++;
      }
      if (j < input.length) {
        tokens.push({ t: 'word', value, quoted: false, regex: true });
        i = j + 1;
        continue;
      }
    }
    if (c === '[') {
      const end = input.indexOf(']', i);
      if (end !== -1) {
        const body = input.slice(i + 1, end);
        const colon = body.indexOf(':');
        tokens.push(
          colon === -1
            ? { t: 'prop', name: body.trim(), value: null }
            : { t: 'prop', name: body.slice(0, colon).trim(), value: body.slice(colon + 1).trim() },
        );
        i = end + 1;
        continue;
      }
    }
    let j = i;
    while (j < input.length && !/[\s()]/.test(input[j]!)) {
      if (input[j] === ':' && j > i) break;
      j++;
    }
    const word = input.slice(i, j);
    if (input[j] === ':') {
      const name = word.toLowerCase();
      if (FIELDS.has(name) || SCOPES.has(name) || name === 'match-case' || name === 'ignore-case') {
        tokens.push({ t: 'prefix', value: name });
        i = j + 1;
        continue;
      }
      // Not an operator: keep "word:rest" as plain text.
      while (j < input.length && !/[\s()]/.test(input[j]!)) j++;
    }
    const text = input.slice(i, j);
    tokens.push(text === 'OR' ? { t: 'op', value: 'OR' } : { t: 'word', value: text, quoted: false, regex: false });
    i = j;
  }
  return tokens;
}

export class QuerySyntaxError extends Error {}

export function parseQuery(input: string): QueryNode | null {
  const tokens = tokenize(input);
  let pos = 0;
  const peek = () => tokens[pos];

  const parseOr = (field: Field, caseSensitive: boolean): QueryNode | null => {
    const children: QueryNode[] = [];
    const first = parseAnd(field, caseSensitive);
    if (first) children.push(first);
    while (peek()?.t === 'op' && (peek() as { value: string }).value === 'OR') {
      pos++;
      const next = parseAnd(field, caseSensitive);
      if (next) children.push(next);
    }
    if (children.length === 0) return null;
    return children.length === 1 ? children[0]! : { type: 'or', children };
  };

  const parseAnd = (field: Field, caseSensitive: boolean): QueryNode | null => {
    const children: QueryNode[] = [];
    for (;;) {
      const token = peek();
      if (!token || (token.t === 'op' && (token.value === ')' || token.value === 'OR'))) break;
      const node = parseUnary(field, caseSensitive);
      if (node) children.push(node);
    }
    if (children.length === 0) return null;
    return children.length === 1 ? children[0]! : { type: 'and', children };
  };

  const parseUnary = (field: Field, caseSensitive: boolean): QueryNode | null => {
    const token = tokens[pos++]!;
    if (token.t === 'op') {
      if (token.value === '-') {
        const child = parseUnary(field, caseSensitive);
        return child ? { type: 'not', child } : null;
      }
      if (token.value === '(') {
        const inner = parseOr(field, caseSensitive);
        if (peek()?.t === 'op' && (peek() as { value: string }).value === ')') pos++;
        return inner;
      }
      return null;
    }
    if (token.t === 'prefix') {
      const name = token.value;
      if (name === 'match-case' || name === 'ignore-case') return parseOperand(field, name === 'match-case');
      if (SCOPES.has(name)) {
        const child = parseOperand('any', caseSensitive);
        return child ? { type: 'scoped', scope: name as 'line', child } : null;
      }
      return parseOperand(name as Field, caseSensitive);
    }
    if (token.t === 'prop') {
      return { type: 'property', name: token.name, value: token.value ? parseQuery(token.value) : null };
    }
    return termOf(token, field, caseSensitive);
  };

  /** The operand after "field:" — a single term or a parenthesized group. */
  const parseOperand = (field: Field, caseSensitive: boolean): QueryNode | null => {
    const token = peek();
    if (!token) return null;
    if (token.t === 'op' && token.value === '(') {
      pos++;
      const inner = parseOr(field, caseSensitive);
      if (peek()?.t === 'op' && (peek() as { value: string }).value === ')') pos++;
      return inner;
    }
    return parseUnary(field, caseSensitive);
  };

  const node = parseOr('any', false);
  while (pos < tokens.length) {
    // Stray ")" — skip it and keep parsing what follows.
    pos++;
    const rest = parseOr('any', false);
    if (rest) return node ? { type: 'and', children: [node, rest] } : rest;
  }
  return node;
}

function termOf(token: Extract<Token, { t: 'word' }>, field: Field, caseSensitive: boolean): QueryNode {
  if (token.regex) {
    try {
      return {
        type: 'term',
        field,
        caseSensitive,
        matcher: { kind: 'regex', regex: new RegExp(token.value, caseSensitive ? '' : 'i') },
      };
    } catch {
      throw new QuerySyntaxError(`Invalid regular expression: /${token.value}/`);
    }
  }
  return { type: 'term', field, caseSensitive, matcher: { kind: 'text', value: token.value, exact: token.quoted } };
}
