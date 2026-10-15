import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { handoffOf, isFresh, matchProject, parseMarker, plain } from '../hooks/memory'
import { panelOf } from '../hooks/register'
import type { MuninnSnapshot } from '../types'

const HOME = '/Users/t'
const CWD = `${HOME}/www/tauantcamargo/lazyreview`
const TOKEN_FILE = `${HOME}/Library/Application Support/ai-memory/auth-tokens/default`
const BASE = 'http://127.0.0.1:49374'
const SCOPE = '/api/v1/workspaces/personal/projects/tauantcamargo-lazyreview'
// Two hours after the handoff below.
const NOW = Date.parse('2026-10-15T05:45:53Z')
const SURFACES = ['terminal', 'desktop'] as const

const FILES = new Map<string, string>([
  [`${CWD}/.git`, ''],
  // A capture-only marker nearer the repo is passed by; the scope comes from the folder above.
  [`${CWD}/.ai-memory.toml`, '[capture]\nignore_paths = ["secrets/**"]\n'],
  [`${HOME}/www/tauantcamargo/.ai-memory.toml`, '# personal repos\nworkspace = "personal"\n'],
  [TOKEN_FILE, 'secret-token\n'],
])

const PROJECTS = [
  { workspace_name: 'personal', project_name: 'tauantcamargo-lazyreview', page_count: 3, last_updated: '2026-10-15T03:45:53Z' },
  { workspace_name: 'astraeus', project_name: 'astraeus-wealth-tech-fortuna', page_count: 40, last_updated: '2026-10-14T03:45:53Z' },
  { workspace_name: 'default', project_name: 'lazyreview', page_count: 1, last_updated: null },
]

const BRIEFING = {
  counts: { pages_latest: 3, sessions: 2, observations: 10 },
  activity_7d: { sessions: 2, observations: 10, pages_updated: 1 },
  last_observation_at: '2026-10-15T03:45:53Z',
  recent_pages: [{ path: 'decisions/auth.md', title: 'Session cookies over JWT rotation', kind: 'decision', updated_at: '2026-10-15T03:45:53Z' }],
}

const HANDOFFS = {
  handoffs: [
    { id: 'h0', agent: 'claude-code', at: '2026-10-14T03:45:53Z', state: 'accepted', summary: 'older', next_steps: [], open_questions: [] },
    { id: 'h1', agent: 'codex', at: '2026-10-15T03:45:53Z', state: 'open', summary: 'Trying session cookies', next_steps: ['wire the cookie'], open_questions: [] },
  ],
}

const HITS = [
  { workspace: 'personal', project: 'tauantcamargo-lazyreview', path: 'decisions/auth.md', title: 'Session cookies over JWT rotation', kind: 'decision', snippet: 'We moved to <mark>cookies</mark> &amp; dropped JWT', rank: -1 },
]

const PAGE = { path: 'decisions/auth.md', title: 'Session cookies over JWT rotation', kind: 'decision', updated_at: '2026-10-15T03:45:53Z', body_markdown: '# Session cookies\n\nWe moved to cookies.' }

const PANE = {
  plugin: 'muninn',
  viewport: { columns: 100, rows: 40 },
  component: 'Pane',
  requestId: 'muninn',
  props: { title: 'Muninn', isFocused: true, bodyColumns: 90, placement: 'inline', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// The host Muninn reads: one repository on disk, the ai-memory server behind `$.http.fetch`.
function world(on: On, opts: { offline?: boolean; placed?: boolean } = {}) {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on)
  mock.env(on, { HOME })
  const fetched: { url: string; auth: string | undefined }[] = []
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []

  on('session.cwd', () => ({ value: CWD }))
  on('fs.exists', ($, e) => ({ value: FILES.has(e.path) }))
  on('fs.read', ($, e) => (FILES.has(e.path) ? { value: FILES.get(e.path)! } : { deny: 'no such file' }))
  on('http.fetch', ($, e) => {
    fetched.push({ url: e.url, auth: e.init?.headers?.Authorization })

    if (opts.offline) {
      return { deny: 'connect ECONNREFUSED 127.0.0.1:49374' }
    }

    const path = e.url.slice(BASE.length)
    const json = (body: unknown) => ({ value: { status: 200, ok: true, headers: {}, text: JSON.stringify(body) } })

    if (path === '/identity') return json({ version: '3.0.0', level: 'root' })
    if (path === '/api/v1/projects') return json(PROJECTS)
    if (path.startsWith(`${SCOPE}/briefing`)) return json(BRIEFING)
    if (path.startsWith(`${SCOPE}/handoffs`)) return json(HANDOFFS)
    if (path.startsWith('/api/v1/search')) return json(HITS)
    if (path === `${SCOPE}/pages/decisions/auth.md`) return json(PAGE)

    return { value: { status: 404, ok: false, headers: {}, text: '{"error":"not found"}' } }
  })
  on('ui.open', () => ({ value: opts.placed === false ? { isPlaced: false as const, reason: 'no-surface' } : { isPlaced: true as const } }))
  on('ui.panes', () => ({ value: [] }))
  // A pane is drawn only where a terminal or the desktop app is attached; VS Code attaches none.
  on('session.surfaces', () => ({ value: opts.placed === false ? [] : ['desktop' as const] }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'muninn' } }))
  on('session.start', () => ({ cwd: CWD }))

  return { clock, fetched, toasts, statuses }
}

const muninn = ($: Engine, args = '') =>
  $.command.run({ command: 'muninn', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })

test('a marker names the workspace; a capture-only one names nothing', () => {
  expect(parseMarker('# x\nworkspace = "personal"\nproject = \'lazy\'\n[capture]\nworkspace = "nope"\n')).toEqual({ workspace: 'personal', project: 'lazy' })
  expect(parseMarker('[capture]\nignore_paths = []\n')).toEqual({})
})

test('the project is the pinned one, the marker’s, or the repository’s name in that workspace', () => {
  const projects = PROJECTS.map(p => ({ workspace: p.workspace_name, project: p.project_name, pages: p.page_count, updatedAt: p.last_updated }))

  expect(matchProject(projects, { workspace: 'personal' }, 'lazyreview')).toEqual({ workspace: 'personal', project: 'tauantcamargo-lazyreview', isGuess: true })
  expect(matchProject(projects, {}, 'lazyreview')).toEqual({ workspace: 'default', project: 'lazyreview', isGuess: true })
  expect(matchProject(projects, { workspace: 'astraeus' }, 'fortuna')?.project).toBe('astraeus-wealth-tech-fortuna')
  expect(matchProject(projects, { workspace: 'personal' }, 'lazyreview', 'astraeus/astraeus-wealth-tech-fortuna')?.project).toBe('astraeus-wealth-tech-fortuna')
  expect(matchProject(projects, { workspace: 'personal', project: 'new-one' }, 'x')).toEqual({ workspace: 'personal', project: 'new-one', isGuess: false })
  expect(matchProject(projects, { workspace: 'palmetto' }, 'keystone')).toBeNull()
})

test('a snippet reads as plain text, and a handoff is fresh while open or just delivered', () => {
  expect(plain('# Title\n- We moved to <mark>cookies</mark> &amp; dropped **JWT**')).toBe('Title We moved to cookies & dropped JWT')

  const newest = handoffOf(HANDOFFS.handoffs)
  expect(newest?.id).toBe('h1')
  expect(isFresh(newest!, NOW)).toBe(true)
  expect(isFresh({ ...newest!, state: 'accepted', acceptedAt: '2026-10-15T05:44:00Z' }, NOW)).toBe(true)
  expect(isFresh({ ...newest!, state: 'accepted', acceptedAt: '2026-10-15T03:46:00Z' }, NOW)).toBe(false)
})

test('/muninn where no surface draws panes prints the dashboard, read with the token file', async ($, on) => {
  const { fetched } = world(on, { placed: false })
  const { text } = await muninn($)

  expect(text).toContain('personal / tauantcamargo-lazyreview')
  expect(text).toContain('3 páginas · 2 sessões · 10 observações')
  expect(text).toContain('de codex · há 2 h · pendente')
  expect(text).toContain('Trying session cookies')
  expect(text).toContain('wire the cookie')
  expect(text).toContain('Session cookies over JWT rotation (decisão, há 2 h)')
  expect(fetched.length).toBeGreaterThan(0)
  expect(fetched.every(f => f.auth === 'Bearer secret-token')).toBe(true)
})

test('/muninn <term> where no surface draws panes prints the hits', async ($, on) => {
  const { fetched } = world(on, { placed: false })
  const { text } = await muninn($, 'cookies')

  expect(text).toContain('1 resultado para “cookies”')
  expect(text).toContain('Session cookies over JWT rotation')
  expect(text).toContain('We moved to cookies & dropped JWT')
  expect(fetched.some(f => f.url.includes('/api/v1/search?q=cookies&limit=12&workspace=personal&project=tauantcamargo-lazyreview'))).toBe(true)
})

test('an unreachable server says so, in the text and on the status line', async ($, on) => {
  const { statuses } = world(on, { offline: true, placed: false })
  const { text } = await muninn($)

  expect(text).toContain('não respondeu em http://127.0.0.1:49374')
  expect(statuses.at(-1)).toBe('Muninn · fora do ar')
})

for (const surface of SURFACES) {
  test(`${surface}: the pane shows the project, opens a page, searches and comes back`, async ($, on) => {
    world(on)
    expect((await muninn($)).text).toBeUndefined()

    const pane = await $.ui.mount({ ...PANE, surface })
    expect(await pane.find({ key: 'muninn-q' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'personal / tauantcamargo-lazyreview' })).toBeDefined()
    expect(await pane.find({ key: 'muninn-recent-open-0' })).toBeDefined()

    await pane.press({ key: 'muninn-recent-open-0' })
    expect((await pane.find({ type: 'Markdown' }))?.props.text).toContain('We moved to cookies.')
    await pane.press({ key: 'muninn-page-back' })
    expect(await pane.find({ key: 'muninn-q' })).toBeDefined()

    await pane.input({ key: 'muninn-q', text: ' cookies ' })
    expect(await pane.find({ key: 'muninn-hit-open-0' })).toBeDefined()
    expect(await pane.find({ key: 'muninn-q2' })).toBeDefined()
    await pane.press({ key: 'muninn-back' })
    expect(await pane.find({ key: 'muninn-recent-open-0' })).toBeDefined()
    await pane.unmount()
  })
}

test('a session that starts with a handoff gets one toast and a count in the status line', async ($, on) => {
  const { clock, toasts, statuses } = world(on)

  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: CWD })
  await clock.advance(1000)
  expect(toasts).toEqual(['Muninn trouxe um handoff pendente de codex (há 2 h): Trying session cookies'])
  expect(statuses.at(-1)).toBe('Muninn · lazyreview · 3 págs · handoff')

  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: CWD })
  await clock.advance(1000)
  expect(toasts).toHaveLength(1)
})

const SNAPSHOT: MuninnSnapshot = {
  at: NOW,
  online: true,
  version: '3.0.0',
  cwd: CWD,
  root: CWD,
  repo: 'lazyreview',
  scope: { workspace: 'personal', project: 'tauantcamargo-lazyreview', isGuess: true },
  counts: { pages: 3, sessions: 2, observations: 10 },
  week: { sessions: 2, observations: 10, pages: 1 },
  lastAt: '2026-10-15T03:45:53Z',
  handoff: handoffOf(HANDOFFS.handoffs),
  recent: [{ workspace: 'personal', project: 'tauantcamargo-lazyreview', path: 'decisions/auth.md', title: 'Session cookies over JWT rotation', kind: 'decision', updatedAt: '2026-10-15T03:45:53Z' }],
  projects: [{ workspace: 'personal', project: 'tauantcamargo-lazyreview', pages: 3, updatedAt: '2026-10-15T03:45:53Z' }],
}

const TAB = { now: NOW, query: '', hits: [], everywhere: false, pinned: undefined, statusLine: true, toast: true }

test('the /mods tab carries the project, a search, recent pages and the settings', () => {
  const panel = panelOf({ ...TAB, lang: 'pt', snap: SNAPSHOT })
  expect(panel.title).toBe('Muninn')
  expect(panel.tone).toBe('warn')
  expect(panel.summary).toBe('tauantcamargo-lazyreview · 3 págs · handoff pendente')
  expect(panel.sections.map(section => section.id)).toEqual(['now', 'search', 'recent', 'settings'])
  expect(panel.sections[2]?.items[0]).toEqual({ kind: 'action', id: 'recent:0', label: 'Abrir', title: 'Session cookies over JWT rotation', help: 'decisão · há 2 h' })

  const hits = [{ ...SNAPSHOT.recent[0]!, snippet: 'We moved to cookies' }]
  const searched = panelOf({ ...TAB, lang: 'en', snap: SNAPSHOT, query: 'cookies', hits })
  const items = searched.sections.find(section => section.id === 'search')?.items ?? []
  expect(items.some(item => item.kind === 'action' && item.id === 'hit:0' && item.title === 'Session cookies over JWT rotation')).toBe(true)
  expect(searched.summary).toBe('tauantcamargo-lazyreview · 3 pages · handoff pending')
})

test('the tab offers a restart when the server is down', () => {
  const panel = panelOf({ ...TAB, lang: 'pt', snap: { ...SNAPSHOT, online: false, error: 'offline', scope: null, handoff: null } })
  expect(panel.tone).toBe('err')
  expect(panel.summary).toBe('fora do ar')
  expect(panel.sections[0]?.items.some(item => item.kind === 'action' && item.id === 'restart')).toBe(true)
})
