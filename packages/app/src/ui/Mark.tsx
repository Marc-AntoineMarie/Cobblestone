/**
 * The Cobblestone mark: four setts laid like a path, printed in navy ink
 * with the pink drum slightly out of register, as risograph prints are.
 */
export function Mark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g className="mark-pink">
        <path d="M9 13c0-3 2-5 5-5h13c3 0 5 2 5 5v11c0 3-2 5-5 5H14c-3 0-5-2-5-5z" />
        <path d="M36 21c0-3 2-5 5-5h11c3 0 5 2 5 5v9c0 3-2 5-5 5H41c-3 0-5-2-5-5z" />
      </g>
      <g className="mark-ink">
        <path d="M7 11c0-3 2-5 5-5h13c3 0 5 2 5 5v11c0 3-2 5-5 5H12c-3 0-5-2-5-5z" />
        <path d="M34 19c0-3 2-5 5-5h11c3 0 5 2 5 5v9c0 3-2 5-5 5H39c-3 0-5-2-5-5z" />
        <path d="M7 38c0-3 2-5 5-5h11c3 0 5 2 5 5v9c0 3-2 5-5 5H12c-3 0-5-2-5-5z" />
        <path d="M32 44c0-3 2-5 5-5h14c3 0 5 2 5 5v8c0 3-2 5-5 5H37c-3 0-5-2-5-5z" />
      </g>
    </svg>
  );
}
