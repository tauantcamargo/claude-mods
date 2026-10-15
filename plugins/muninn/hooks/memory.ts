import type { MuninnHandoff, MuninnPageRef, MuninnProject, MuninnScope, MuninnSnapshot } from '../types'

// The pure half of reading ai-memory: its shapes, where a folder's memory lives, and the words
// a snapshot is built from. Everything that calls `$` lives in register.tsx, since the engine
// follows `$` only into functions of the file that holds the hooks.

export const DEFAULT_SERVER = 'http://127.0.0.1:49374'
export const MARKER = '.ai-memory.toml'

export type Conn = { base: string; token?: string }

export type MemoryErrorKind = 'offline' | 'unauthorized' | 'http'

export class MemoryError extends Error {
  constructor(
    readonly kind: MemoryErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

// What a snapshot says went wrong: 'offline', 'unauthorized' or the server's own words.
export const kindOf = (error: unknown): string => (error instanceof MemoryError ? (error.kind === 'http' ? error.message : error.kind) : messageOf(error))

// --- Where a folder's memory lives

export type Marker = { workspace?: string; project?: string }

// The top-level `workspace` and `project` of a marker; a marker that only holds `[capture]`
// names neither and is passed by, as ai-memory's own walk does.
export function parseMarker(text: string): Marker {
  const marker: Marker = {}

  for (const raw of text.split('\n')) {
    const line = raw.trim()

    if (line.startsWith('[')) {
      break
    }

    const found = /^(workspace|project)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(line)

    if (found) {
      const value = (found[2] ?? found[3] ?? '').trim()

      if (value !== '') {
        marker[found[1] as keyof Marker] = value
      }
    }
  }

  return marker
}

export const parentOf = (dir: string): string => {
  const trimmed = dir.replace(/\/+$/, '')
  const cut = trimmed.lastIndexOf('/')

  return cut <= 0 ? '/' : trimmed.slice(0, cut)
}

export const baseOf = (dir: string): string => dir.replace(/\/+$/, '').split('/').pop() || dir

// The project for this folder: a pinned one, the marker's, else the one whose name is the
// repository's (`lazyreview`) or ends with it (`acme-lazyreview`, ai-memory's remote-path name),
// most recently updated first.
export function matchProject(projects: readonly MuninnProject[], marker: Marker, repo: string, pinned?: string): MuninnScope | null {
  if (pinned) {
    const cut = pinned.indexOf('/')
    const workspace = pinned.slice(0, cut)
    const project = pinned.slice(cut + 1)

    if (cut > 0 && projects.some(p => p.workspace === workspace && p.project === project)) {
      return { workspace, project, isGuess: false }
    }
  }

  const workspace = marker.workspace ?? 'default'

  if (marker.project) {
    return { workspace, project: marker.project, isGuess: false }
  }

  const name = repo.toLowerCase()
  const found = projects
    .filter(p => p.workspace === workspace && (p.project.toLowerCase() === name || p.project.toLowerCase().endsWith(`-${name}`)))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0]

  return found ? { workspace: found.workspace, project: found.project, isGuess: true } : null
}

// --- The server's shapes, and the snapshot built from them

export type ProjectRow = { workspace_name: string; project_name: string; page_count: number; last_updated: string | null }

export type PageRow = { path: string; title?: string | null; kind?: string | null; updated_at?: string | null }

export type PageBody = PageRow & { body_markdown?: string }

export type Briefing = {
  counts?: { pages_latest?: number; sessions?: number; observations?: number }
  activity_7d?: { sessions?: number; observations?: number; pages_updated?: number }
  last_observation_at?: string | null
  recent_pages?: PageRow[]
}

export type HandoffRow = {
  id: string
  agent?: string
  at: string
  state?: string
  accepted_at?: string | null
  summary?: string | null
  next_steps?: string[] | null
  open_questions?: string[] | null
}

export type HitRow = { workspace: string; project: string; path: string; title?: string | null; kind?: string | null; snippet?: string | null }

const enc = encodeURIComponent

export const projectPath = (scope: { workspace: string; project: string }): string => `/api/v1/workspaces/${enc(scope.workspace)}/projects/${enc(scope.project)}`

export const pagePath = (path: string): string => path.split('/').map(enc).join('/')

export const refOf = (scope: { workspace: string; project: string }, row: PageRow): MuninnPageRef => ({
  workspace: scope.workspace,
  project: scope.project,
  path: row.path,
  title: row.title || row.path,
  kind: row.kind || 'fact',
  ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
})

export const projectsOf = (rows: readonly ProjectRow[]): MuninnProject[] =>
  rows.map(row => ({ workspace: row.workspace_name, project: row.project_name, pages: row.page_count, updatedAt: row.last_updated }))

export function handoffOf(rows: readonly HandoffRow[]): MuninnHandoff | null {
  const newest = [...rows].sort((a, b) => b.at.localeCompare(a.at))[0]

  if (newest === undefined) {
    return null
  }

  return {
    id: newest.id,
    agent: newest.agent || 'agent',
    at: newest.at,
    state: newest.state || 'open',
    ...(newest.accepted_at ? { acceptedAt: newest.accepted_at } : {}),
    ...(newest.summary ? { summary: newest.summary } : {}),
    nextSteps: newest.next_steps ?? [],
    openQuestions: newest.open_questions ?? [],
  }
}

// A snapshot with its project's briefing and handoffs folded in.
export function briefed(online: MuninnSnapshot, scope: MuninnScope, briefing: Briefing, handoffs: readonly HandoffRow[]): MuninnSnapshot {
  return {
    ...online,
    counts: { pages: briefing.counts?.pages_latest ?? 0, sessions: briefing.counts?.sessions ?? 0, observations: briefing.counts?.observations ?? 0 },
    week: { sessions: briefing.activity_7d?.sessions ?? 0, observations: briefing.activity_7d?.observations ?? 0, pages: briefing.activity_7d?.pages_updated ?? 0 },
    lastAt: briefing.last_observation_at ?? null,
    handoff: handoffOf(handoffs),
    recent: (briefing.recent_pages ?? []).map(row => refOf(scope, row)),
  }
}

export const webUrl = (base: string, ref?: { workspace: string; project: string; path?: string }): string =>
  ref === undefined ? `${base}/web` : `${base}/web/w/${enc(ref.workspace)}/${enc(ref.project)}${ref.path ? `/p/${pagePath(ref.path)}` : ''}`

// --- Text

const ENTITIES: Readonly<Record<string, string>> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" }

// A search snippet as plain text: no `<mark>`, no markdown headings or bullets, one line.
export function plain(snippet: string): string {
  return snippet
    .replace(/<\/?mark>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|#x27);/g, m => ENTITIES[m] ?? m)
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`)

// Milliseconds since an ISO time, never negative; null when there is none.
export const sinceOf = (now: number, iso: string | null | undefined): number | null => {
  if (!iso) {
    return null
  }

  const at = Date.parse(iso)

  return Number.isNaN(at) ? null : Math.max(0, now - at)
}

// A handoff delivered to this session: accepted within the last few minutes.
export const isFresh = (handoff: MuninnHandoff, now: number): boolean => {
  if (handoff.state === 'open') {
    return true
  }

  const since = sinceOf(now, handoff.acceptedAt ?? handoff.at)

  return handoff.state === 'accepted' && since !== null && since < 5 * 60_000
}
