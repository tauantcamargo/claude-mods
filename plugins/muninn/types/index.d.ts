// Muninn's contract: the ai-memory snapshot it keeps for the session, and its noun on `$`,
// the tab it hands the /mods hub (claude-mods-hub, PROTOCOL.md).

export type MuninnLang = 'en' | 'pt'

export type MuninnScope = {
  workspace: string
  project: string
  // True when the project was matched from the folder's name, not pinned or named in a marker.
  isGuess: boolean
}

export type MuninnHandoff = {
  id: string
  agent: string
  at: string
  state: string
  acceptedAt?: string
  summary?: string
  nextSteps: string[]
  openQuestions: string[]
}

export type MuninnPageRef = { workspace: string; project: string; path: string; title: string; kind: string; updatedAt?: string }

export type MuninnHit = MuninnPageRef & { snippet: string }

export type MuninnProject = { workspace: string; project: string; pages: number; updatedAt: string | null }

export type MuninnSnapshot = {
  // When it was fetched, ms since the epoch.
  at: number
  online: boolean
  // What went wrong, when something did: 'offline', 'unauthorized' or the server's words.
  error?: string
  version?: string
  // The folder the session runs in, its repository root (where a pin is kept) and the
  // repository's name, which Muninn matches the project by.
  cwd: string
  root: string
  repo: string
  // Where the session's memory lives; null while the server knows no project for this folder.
  scope: MuninnScope | null
  counts?: { pages: number; sessions: number; observations: number }
  week?: { sessions: number; observations: number; pages: number }
  lastAt?: string | null
  handoff: MuninnHandoff | null
  recent: MuninnPageRef[]
  projects: MuninnProject[]
}

export type MuninnPage = MuninnPageRef & { body: string }

export type MuninnView = 'home' | 'search' | 'page'

// The /mods hub protocol: one tab, drawn by the hub.
export type MuninnPanelArgs = { lang: MuninnLang; surface: 'terminal' | 'desktop' | 'vscode' | 'mobile'; columns: number }
export type MuninnTone = 'ok' | 'warn' | 'err' | 'muted' | 'accent'
export type MuninnScopeOf = 'user' | 'session'
export type MuninnItem =
  | { kind: 'toggle'; id: string; label: string; help?: string; value: boolean; scope?: MuninnScopeOf }
  | { kind: 'choice'; id: string; label: string; help?: string; value: string; options: { value: string; label: string }[]; scope?: MuninnScopeOf }
  | { kind: 'action'; id: string; label: string; title?: string; help?: string; primary?: boolean; scope?: MuninnScopeOf }
  | { kind: 'input'; id: string; label: string; help?: string; placeholder?: string; submitLabel?: string; scope?: MuninnScopeOf }
  | { kind: 'info'; label: string; value: string; tone?: MuninnTone }
  | { kind: 'text'; text: string; tone?: MuninnTone }
  | { kind: 'swatch'; id: string; label: string; color: string; selected: boolean }
  | { kind: 'tree'; tree: unknown }
export type MuninnSection = { id: string; title: string; items: MuninnItem[] }
export type MuninnPanel = { title: string; summary?: string; tone?: MuninnTone; percent?: number; sections: MuninnSection[]; refreshMs?: number }
export type MuninnActArgs = { id: string; value?: string }
export type MuninnActResult = { message?: string }

declare module 'claude-code' {
  interface EngineInterface {
    muninn: {
      panel: (args: MuninnPanelArgs) => Promise<MuninnPanel>
      act: (args: MuninnActArgs) => Promise<MuninnActResult>
    }
  }
  interface PluginState {
    muninn: {
      snapshot: MuninnSnapshot | null
      // A fetch in flight: the pane says so instead of looking stale.
      isBusy: boolean
      view: MuninnView
      query: string
      // Whether the last search covered every project, not just this folder's.
      everywhere: boolean
      results: MuninnHit[]
      page: MuninnPage | null
      lang: MuninnLang
    }
  }
}
