import { parseHotkey, type Command } from '../commands';
import { t } from '../i18n';
import type { Session } from '../session';
import type { Preferences } from '../settings';
import { activeTab, closeTab, findPane, navigate, setMode, split } from '../workspace/workspace';

/** Registers the application commands; returns a function removing them. */
export function registerAppCommands(
  session: Session,
  options: { switchVault: () => void; preferences: () => Preferences; updatePreferences: (p: Partial<Preferences>) => void },
): () => void {
  const hk = (...specs: string[]) => specs.map(parseHotkey);
  // Browsers keep some shortcuts for themselves (Ctrl+N opens a window, Ctrl+W closes the tab):
  // on the web, an Alt variant comes first and is the one shown.
  const web = session.platform.kind === 'web';
  const reserved = (spec: string, alternative: string) => (web ? hk(alternative, spec) : hk(spec));
  const noteOpen = () => session.activeView?.type === 'note';
  const ws = session.workspace;

  const commands: Command[] = [
    {
      id: 'note:new',
      name: t('cmd.newNote'),
      section: t('cmd.section.note'),
      hotkeys: reserved('Mod+N', 'Alt+N'),
      run: () => void session.createNote(),
    },
    {
      id: 'finder:notes',
      name: t('cmd.openFinder'),
      section: t('cmd.section.navigation'),
      hotkeys: hk('Mod+K', 'Mod+O'),
      run: () => session.ui.setState({ finder: { mode: 'notes' } }),
    },
    {
      id: 'finder:commands',
      name: t('cmd.openCommands'),
      section: t('cmd.section.navigation'),
      hotkeys: hk('Mod+P', 'Mod+Shift+P'),
      run: () => session.ui.setState({ finder: { mode: 'commands' } }),
    },
    {
      id: 'note:today',
      name: t('cmd.today'),
      section: t('cmd.section.note'),
      hotkeys: hk('Mod+Shift+D'),
      run: () => void session.openDailyNote(),
    },
    {
      id: 'view:toggle-mode',
      name: t('cmd.toggleMode'),
      section: t('cmd.section.view'),
      hotkeys: hk('Mod+E'),
      when: noteOpen,
      run: () => {
        const state = ws.getState();
        const tab = activeTab(state);
        if (tab?.view.type !== 'note') return;
        const next = (tab.view.mode ?? session.settings.getState().defaultMode) === 'read' ? 'live' : 'read';
        ws.setState(setMode(state, state.activePane, tab.id, next));
      },
    },
    {
      id: 'view:source-mode',
      name: t('cmd.sourceMode'),
      section: t('cmd.section.view'),
      when: noteOpen,
      run: () => {
        const state = ws.getState();
        const tab = activeTab(state);
        if (tab?.view.type !== 'note') return;
        ws.setState(setMode(state, state.activePane, tab.id, tab.view.mode === 'source' ? 'live' : 'source'));
      },
    },
    {
      id: 'tab:close',
      name: t('cmd.closeTab'),
      section: t('cmd.section.navigation'),
      hotkeys: reserved('Mod+W', 'Alt+W'),
      run: () => {
        const state = ws.getState();
        const pane = findPane(state);
        if (pane) ws.setState(closeTab(state, pane.id, pane.activeTab));
      },
    },
    {
      id: 'nav:back',
      name: t('cmd.back'),
      section: t('cmd.section.navigation'),
      hotkeys: hk('Mod+Alt+ArrowLeft', 'Alt+ArrowLeft'),
      run: () => ws.setState(navigate(ws.getState(), 'back')),
    },
    {
      id: 'nav:forward',
      name: t('cmd.forward'),
      section: t('cmd.section.navigation'),
      hotkeys: hk('Mod+Alt+ArrowRight', 'Alt+ArrowRight'),
      run: () => ws.setState(navigate(ws.getState(), 'forward')),
    },
    {
      id: 'view:split-right',
      name: t('cmd.splitRight'),
      section: t('cmd.section.view'),
      hotkeys: hk('Mod+\\'),
      run: () => ws.setState(split(ws.getState(), 'row')),
    },
    {
      id: 'view:split-down',
      name: t('cmd.splitDown'),
      section: t('cmd.section.view'),
      run: () => ws.setState(split(ws.getState(), 'column')),
    },
    {
      id: 'view:toggle-rail',
      name: t('cmd.toggleRail'),
      section: t('cmd.section.view'),
      hotkeys: hk('Mod+Shift+\\', 'Mod+['),
      run: () => session.ui.setState((s) => ({ railOpen: !s.railOpen })),
    },
    {
      id: 'view:toggle-margin',
      name: t('cmd.toggleMargin'),
      section: t('cmd.section.view'),
      hotkeys: hk('Mod+]'),
      run: () => session.ui.setState((s) => ({ marginOpen: !s.marginOpen })),
    },
    {
      id: 'view:graph',
      name: t('cmd.graph'),
      section: t('cmd.section.view'),
      hotkeys: hk('Mod+G'),
      run: () => session.openView({ type: 'graph' }, 'tab'),
    },
    {
      id: 'view:local-graph',
      name: t('cmd.localGraph'),
      section: t('cmd.section.view'),
      when: noteOpen,
      run: () => session.openView({ type: 'graph', focus: session.activePath! }, 'split-right'),
    },
    {
      id: 'app:settings',
      name: t('cmd.settings'),
      section: t('cmd.section.vault'),
      hotkeys: hk('Mod+,'),
      run: () => session.openView({ type: 'settings' }, 'tab'),
    },
    {
      id: 'app:switch-vault',
      name: t('cmd.switchVault'),
      section: t('cmd.section.vault'),
      run: options.switchVault,
    },
    {
      id: 'app:toggle-theme',
      name: t('cmd.toggleTheme'),
      section: t('cmd.section.view'),
      run: () => {
        const current = options.preferences().theme;
        const night = current === 'night' || (current === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        options.updatePreferences({ theme: night ? 'day' : 'night' });
      },
    },
    {
      id: 'note:rename',
      name: t('cmd.renameNote'),
      section: t('cmd.section.note'),
      hotkeys: hk('F2'),
      when: noteOpen,
      run: () => session.ui.setState({ focusTitle: session.activePath }),
    },
    {
      id: 'canvas:new',
      name: t('cmd.newCanvas'),
      section: t('cmd.section.note'),
      run: () => void session.createCanvas(),
    },
    {
      id: 'note:insert-template',
      name: t('cmd.insertTemplate'),
      section: t('cmd.section.note'),
      hotkeys: hk('Alt+T'),
      when: noteOpen,
      run: () => session.insertTemplate(),
    },
    {
      id: 'note:bookmark',
      name: t('cmd.bookmark'),
      section: t('cmd.section.note'),
      when: () => session.activePath !== null,
      run: () => session.toggleBookmark(session.activePath!),
    },
    {
      id: 'note:delete',
      name: t('cmd.deleteNote'),
      section: t('cmd.section.note'),
      when: noteOpen,
      run: () => void session.delete(session.activePath!),
    },
    {
      id: 'note:reveal',
      name: t('cmd.revealFile'),
      section: t('cmd.section.note'),
      when: () => session.activePath !== null,
      run: () => session.revealInTree(session.activePath!),
    },
    {
      id: 'note:reveal-system',
      name: t('cmd.revealSystem'),
      section: t('cmd.section.note'),
      when: () => session.canRevealInSystem && session.activePath !== null,
      run: () => session.revealInSystem(session.activePath!),
    },
    {
      id: 'note:copy-link',
      name: t('cmd.copyLink'),
      section: t('cmd.section.note'),
      when: () => session.activePath !== null,
      run: () => {
        const path = session.activePath!;
        const text = `[[${session.vault.cache.resolver.linkText(path, '')}]]`;
        void navigator.clipboard?.writeText(text);
      },
    },
  ];

  const disposers = commands.map((command) => session.commands.register(command));
  return () => disposers.forEach((dispose) => dispose());
}
