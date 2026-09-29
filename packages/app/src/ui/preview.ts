import type { Session } from '../session';

/*
 * Hover previews: a short delay before showing (so passing the pointer over a
 * link does nothing), and a grace period before hiding (so the pointer can
 * travel from the link into the preview).
 */

let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function schedulePreview(session: Session, linktext: string, sourcePath: string, anchor: Element, delay = 350) {
  clearTimeout(hideTimer);
  clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    const r = anchor.getBoundingClientRect();
    session.ui.setState({
      preview: { linktext, sourcePath, rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } },
    });
  }, delay);
}

export function hidePreviewSoon(session: Session, delay = 250) {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => session.ui.setState({ preview: null }), delay);
}

export function keepPreview() {
  clearTimeout(hideTimer);
}

export function hidePreviewNow(session: Session) {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (session.ui.getState().preview) session.ui.setState({ preview: null });
}
