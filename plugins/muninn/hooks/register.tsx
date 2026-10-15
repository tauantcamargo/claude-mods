import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, RenderSurface } from 'claude-code'

import type { MuninnActArgs, MuninnActResult, MuninnHit, MuninnItem, MuninnLang, MuninnPage, MuninnPageRef, MuninnPanel, MuninnPanelArgs, MuninnScope, MuninnSection, MuninnSnapshot } from '../types'
import { WORDS } from './i18n'
import type { Words } from './i18n'
import { action, empty, field, icon, kitOf, notice, picker, row, section, stack, status, text, toggle, value } from './kit/kit'
import type { Kit } from './kit/kit'
import { toneOf } from './kit/tone'
import type { KitSkin, KitTone } from './kit/tone'
import { baseOf, briefed, clip, DEFAULT_SERVER, isFresh, kindOf as errorKindOf, MARKER, matchProject, MemoryError, messageOf, pagePath, parentOf, parseMarker, plain, projectPath, projectsOf, refOf, sinceOf, webUrl } from './memory'
import type { Briefing, Conn, HandoffRow, HitRow, Marker, PageBody, ProjectRow } from './memory'

// Muninn, Odin's raven of memory: the ai-memory server in Claude Code. A pane (/muninn), a tab
// in the /mods hub, a count in the status line and a toast when a session starts with a
// handoff. It only reads the server (memory.ts); capture stays with ai-memory's own hooks.

const PANE = 'muninn'
// A snapshot younger than this is drawn as it is; older, the hub's tab fetches afresh.
const STALE_MS = 15_000
const POLL_MS = 120_000

const snapshotAtom = atom({ plugin: 'muninn', key: 'snapshot' } as const, null)
const busyAtom = atom({ plugin: 'muninn', key: 'isBusy' } as const, false)
const viewAtom = atom({ plugin: 'muninn', key: 'view' } as const, 'home')
const queryAtom = atom({ plugin: 'muninn', key: 'query' } as const, '')
const everywhereAtom = atom({ plugin: 'muninn', key: 'everywhere' } as const, false)
const resultsAtom = atom({ plugin: 'muninn', key: 'results' } as const, [])
const pageAtom = atom({ plugin: 'muninn', key: 'page' } as const, null)
const langAtom = atom({ plugin: 'muninn', key: 'lang' } as const, 'pt')

const wordsOf = (lang: MuninnLang): Words => WORDS[lang === 'en' ? 'en' : 'pt']

// --- Settings: the user's, in the store every session shares

async function langOf($: EngineInterface): Promise<MuninnLang> {
  return (await $.store.get('lang')) === 'en' ? 'en' : 'pt'
}

async function settingOf($: EngineInterface, key: 'statusLine' | 'toast'): Promise<boolean> {
  return (await $.store.get(key)) !== false
}

async function pinsOf($: EngineInterface): Promise<Record<string, string>> {
  const pins = await $.store.get('pins')

  return pins !== null && typeof pins === 'object' && !Array.isArray(pins) ? (pins as Record<string, string>) : {}
}

// The skin every mod of the pack wears, from skins; Claude Code's own colours without it.
async function skinOf($: EngineInterface): Promise<KitSkin | null> {
  try {
    return await $.skins.palette()
  } catch {
    return null
  }
}

// --- Reading the ai-memory server: its read-only `/api/v1` (and `/identity`), with the root
// bearer `ai-memory setup` wrote to the data directory. Every function that calls `$` is in
// this file: the engine follows `$` into a function of the hooks' own file, never an import.

// The server and its credential: AI_MEMORY_SERVER_URL and AI_MEMORY_AUTH_TOKEN when set, else
// loopback and the token file under the data directory (macOS, then the XDG path on Linux).
async function connOf($: EngineInterface): Promise<Conn> {
  const url = (await $.env.get('AI_MEMORY_SERVER_URL')) ?? ''
  const base = (url.trim() || DEFAULT_SERVER).replace(/\/+$/, '').replace(/\/mcp$/, '')
  const fromEnv = (await $.env.get('AI_MEMORY_AUTH_TOKEN'))?.trim()

  if (fromEnv) {
    return { base, token: fromEnv }
  }

  const home = (await $.env.get('HOME')) ?? ''
  const dataDir = (await $.env.get('AI_MEMORY_DATA_DIR'))?.trim()
  const xdg = (await $.env.get('XDG_DATA_HOME'))?.trim()
  const files = [
    ...(dataDir ? [`${dataDir}/auth-tokens/default`] : []),
    `${home}/Library/Application Support/ai-memory/auth-tokens/default`,
    `${xdg || `${home}/.local/share`}/ai-memory/auth-tokens/default`,
  ]

  for (const file of files) {
    try {
      const found = await $.fs.read(file)

      if (typeof found === 'string' && found.trim() !== '') {
        return { base, token: found.trim() }
      }
    } catch {
      // Not this one.
    }
  }

  return { base }
}

async function getJson<T>($: EngineInterface, conn: Conn, path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (conn.token) {
    headers.Authorization = `Bearer ${conn.token}`
  }

  let response

  try {
    response = await $.http.fetch(`${conn.base}${path}`, { headers })
  } catch (error) {
    throw new MemoryError('offline', messageOf(error))
  }

  if (response.status === 401 || response.status === 403) {
    throw new MemoryError('unauthorized', `HTTP ${response.status}`, response.status)
  }

  if (!response.ok) {
    throw new MemoryError('http', `HTTP ${response.status}`, response.status)
  }

  return JSON.parse(response.text) as T
}

// Walks up from the session's folder to home: the nearest marker that names a scope, and the
// repository root (the nearest folder holding `.git`), whose name the project is matched by.
async function localOf($: EngineInterface, cwd: string, home: string): Promise<{ marker: Marker; root: string }> {
  let marker: Marker = {}
  let root: string | undefined
  let dir = cwd

  for (let depth = 0; depth < 32; depth++) {
    if (root === undefined && (await $.fs.exists(`${dir}/.git`))) {
      root = dir
    }

    if (marker.workspace === undefined && marker.project === undefined && (await $.fs.exists(`${dir}/${MARKER}`))) {
      try {
        marker = parseMarker(String(await $.fs.read(`${dir}/${MARKER}`)))
      } catch {
        marker = {}
      }
    }

    const done = (marker.workspace !== undefined || marker.project !== undefined) && root !== undefined

    if (done || dir === home || dir === '/') {
      break
    }

    dir = parentOf(dir)
  }

  return { marker, root: root ?? cwd }
}

async function snapshotOf($: EngineInterface, pins: Readonly<Record<string, string>> = {}): Promise<MuninnSnapshot> {
  const at = await $.clock.now()
  const cwd = await $.session.cwd()
  const home = (await $.env.get('HOME')) ?? ''
  const { marker, root } = await localOf($, cwd, home)
  const repo = baseOf(root)
  const blank: MuninnSnapshot = { at, online: false, cwd, root, repo, scope: null, handoff: null, recent: [], projects: [] }

  try {
    const conn = await connOf($)
    const [identity, rows] = await Promise.all([
      getJson<{ version?: string }>($, conn, '/identity').catch((): { version?: string } => ({})),
      getJson<ProjectRow[]>($, conn, '/api/v1/projects'),
    ])
    const projects = projectsOf(rows)
    const scope = matchProject(projects, marker, repo, pins[root] ?? pins[cwd])
    const online: MuninnSnapshot = { ...blank, online: true, ...(identity.version ? { version: identity.version } : {}), scope, projects }

    if (scope === null) {
      return online
    }

    const [briefing, handoffs] = await Promise.all([
      getJson<Briefing>($, conn, `${projectPath(scope)}/briefing?limit=8`).catch((error: unknown): Briefing => {
        if (error instanceof MemoryError && error.status === 404) {
          return {}
        }

        throw error
      }),
      getJson<{ handoffs?: HandoffRow[] }>($, conn, `${projectPath(scope)}/handoffs?limit=5`).catch((): { handoffs?: HandoffRow[] } => ({})),
    ])

    return briefed(online, scope, briefing, handoffs.handoffs ?? [])
  } catch (error) {
    return { ...blank, error: errorKindOf(error) }
  }
}

// A project's hybrid search (the ranker `memory_query` uses), or FTS5 over every project.
async function searchOf($: EngineInterface, scope: MuninnScope | null, query: string): Promise<MuninnHit[]> {
  const conn = await connOf($)
  const params = new URLSearchParams({ q: query, limit: '12' })

  if (scope) {
    params.set('workspace', scope.workspace)
    params.set('project', scope.project)
  }

  const rows = await getJson<HitRow[]>($, conn, `/api/v1/search?${params.toString()}`)

  return rows.map(row => ({ ...refOf(row, row), snippet: plain(row.snippet ?? '') }))
}

async function pageOf($: EngineInterface, ref: MuninnPageRef): Promise<MuninnPage> {
  const conn = await connOf($)
  const row = await getJson<PageBody>($, conn, `${projectPath(ref)}/pages/${pagePath(ref.path)}`)

  return { ...ref, title: row.title || ref.title, kind: row.kind || ref.kind, ...(row.updated_at ? { updatedAt: row.updated_at } : {}), body: row.body_markdown ?? '' }
}

// --- Keeping a snapshot

let inflight: Promise<MuninnSnapshot> | undefined

// A fresh snapshot, kept for the session and shown in the status line. One at a time: a call
// while one is in flight gets that one. Never from a render, which may not write state.
function refresh($: EngineInterface): Promise<MuninnSnapshot> {
  inflight ??= (async () => {
    await update($, busyAtom, () => true)

    try {
      const snap = await snapshotOf($, await pinsOf($))
      await keep($, snap)

      return snap
    } finally {
      inflight = undefined
      await update($, busyAtom, () => false)
    }
  })()

  return inflight
}

async function keep($: EngineInterface, snap: MuninnSnapshot): Promise<void> {
  await update($, snapshotAtom, () => snap)
  await showStatus($, snap)
}

// The hub draws its tab from inside its own render, where nothing may be written: what is held
// when it is fresh, else a fetch, kept from a timer.
async function snapshotForPanel($: EngineInterface): Promise<MuninnSnapshot> {
  const held = await read($, snapshotAtom)

  if (held !== null && (await $.clock.now()) - held.at < STALE_MS) {
    return held
  }

  const snap = await snapshotOf($, await pinsOf($))
  $.clock.after(0, () => void keep($, snap))

  return snap
}

async function showStatus($: EngineInterface, snap: MuninnSnapshot): Promise<void> {
  if (!(await settingOf($, 'statusLine'))) {
    $.ui.status(undefined)

    return
  }

  const w = wordsOf(await langOf($))

  if (!snap.online) {
    $.ui.status(w.statusOffline)
  } else if (snap.scope === null) {
    $.ui.status(undefined)
  } else {
    $.ui.status(w.status(snap.repo, snap.counts?.pages ?? 0, snap.handoff?.state === 'open'))
  }
}

// The toast a session starts with when it was handed a handoff: once per handoff.
async function greet($: EngineInterface): Promise<void> {
  const snap = await refresh($)
  const handoff = snap.handoff
  const now = await $.clock.now()

  if (handoff === null || !isFresh(handoff, now) || !(await settingOf($, 'toast'))) {
    return
  }

  const seen = await $.store.get('toasted')
  const ids = Array.isArray(seen) ? (seen as string[]) : []

  if (ids.includes(handoff.id)) {
    return
  }

  await $.store.set('toasted', [...ids, handoff.id].slice(-20))
  const w = wordsOf(await langOf($))
  const summary = handoff.summary ? clip(handoff.summary, 90) : undefined
  $.ui.toast(w.toast(handoff.agent, w.ago(sinceOf(now, handoff.at) ?? 0), summary, handoff.state === 'open'), { timeoutMs: 8000 })
}

async function runSearch($: EngineInterface, query: string, everywhere: boolean): Promise<void> {
  await update($, queryAtom, () => query)
  await update($, everywhereAtom, () => everywhere)
  await update($, viewAtom, () => 'search')
  await update($, busyAtom, () => true)

  try {
    const snap = (await read($, snapshotAtom)) ?? (await refresh($))
    // With no project for this folder yet, a search covers every project.
    const hits = await searchOf($, everywhere ? null : snap.scope, query)
    await update($, resultsAtom, () => hits)
  } catch (error) {
    await update($, resultsAtom, () => [])
    $.ui.toast(`Muninn: ${messageOf(error)}`)
  } finally {
    await update($, busyAtom, () => false)
  }
}

async function openPage($: EngineInterface, ref: MuninnPageRef): Promise<void> {
  await update($, busyAtom, () => true)

  try {
    const page = await pageOf($, ref)
    await update($, pageAtom, () => page)
    await update($, viewAtom, () => 'page')
  } catch (error) {
    $.ui.toast(`Muninn: ${messageOf(error)}`)
  } finally {
    await update($, busyAtom, () => false)
  }
}

async function openPane($: EngineInterface, w: Words): Promise<boolean> {
  const opened = await $.ui.open({ id: PANE, title: w.title, focus: true, closeOnEscape: true })

  return opened.isPlaced
}

// The wiki in the browser: macOS `open`, then `xdg-open`; the address on the clipboard when
// neither runs here.
async function openWeb($: EngineInterface, ref?: MuninnPageRef | { workspace: string; project: string }): Promise<boolean> {
  const url = webUrl((await connOf($)).base, ref)

  for (const argv of [['open', url], ['xdg-open', url]]) {
    try {
      if ((await $.process.run(argv, { timeoutMs: 5000 })).exitCode === 0) {
        return true
      }
    } catch {
      // Not on this host.
    }
  }

  return (await $.ui.copy({ text: url })).isCopied
}

// The web UI's password on a fresh install is the root token itself (any user name).
async function copyPassword($: EngineInterface, surface?: RenderSurface): Promise<boolean> {
  const { token } = await connOf($)

  if (!token) {
    return false
  }

  return (await $.ui.copy(surface === undefined ? { text: token } : { text: token, surface })).isCopied
}

// The per-user service `ai-memory setup` installed: the LaunchAgent on macOS, systemd on Linux.
async function restartServer($: EngineInterface): Promise<boolean> {
  const tries: string[][] = []

  try {
    const uid = (await $.process.run(['id', '-u'], { timeoutMs: 5000 })).stdout.trim()

    if (/^\d+$/.test(uid)) {
      tries.push(['launchctl', 'kickstart', '-k', `gui/${uid}/com.github.akitaonrails.ai-memory`])
    }
  } catch {
    // No `id` here.
  }

  tries.push(['systemctl', '--user', 'restart', 'ai-memory.service'])

  for (const argv of tries) {
    try {
      if ((await $.process.run(argv, { timeoutMs: 15_000 })).exitCode === 0) {
        await $.clock.sleep(1500)
        await refresh($)

        return true
      }
    } catch {
      // Try the next.
    }
  }

  return false
}

async function setPin($: EngineInterface, choice: string): Promise<void> {
  const snap = (await read($, snapshotAtom)) ?? (await refresh($))
  const pins = { ...(await pinsOf($)) }

  if (choice === 'auto' || choice === '') {
    delete pins[snap.root]
  } else {
    pins[snap.root] = choice
  }

  await $.store.set('pins', pins)
  await refresh($)
}

// --- Words for one snapshot

const kindOf = (w: Words, kind: string): string => w.kinds[kind] ?? kind

const agoOf = (w: Words, now: number, iso: string | null | undefined): string => {
  const since = sinceOf(now, iso)

  return since === null ? w.never : w.ago(since)
}

const whereOf = (snap: MuninnSnapshot): string => (snap.scope === null ? snap.repo : `${snap.scope.workspace} / ${snap.scope.project}`)

const handoffLine = (w: Words, snap: MuninnSnapshot, now: number): string | null => {
  const h = snap.handoff

  return h === null ? null : w.handoffFrom(h.agent, w.ago(sinceOf(now, h.at) ?? 0), w.handoffState(h.state, isFresh(h, now)))
}

// What /muninn prints where no surface draws a pane (VS Code, a headless run).
export function dashboardText(w: Words, snap: MuninnSnapshot, now: number): string {
  const lines = [`**${w.title}** · ${w.tagline}`]

  if (!snap.online) {
    lines.push(snap.error === 'unauthorized' ? w.unauthorizedHint : w.offlineHint(DEFAULT_SERVER))

    return lines.join('\n')
  }

  if (snap.scope === null) {
    lines.push(w.nothingHere(snap.repo), w.nothingHereHint)

    return lines.join('\n')
  }

  lines.push(`- ${w.project}: ${whereOf(snap)}`)

  if (snap.counts) {
    lines.push(`- ${w.memory}: ${w.counts(snap.counts.pages, snap.counts.sessions, snap.counts.observations)}`)
  }

  lines.push(`- ${w.last}: ${agoOf(w, now, snap.lastAt)}`)

  const h = snap.handoff

  if (h !== null) {
    lines.push('', `**${w.handoff}** ${handoffLine(w, snap, now)}`)

    if (h.summary) {
      lines.push(clip(h.summary, 400))
    }

    for (const step of h.nextSteps.slice(0, 5)) {
      lines.push(`- ${w.nextSteps}: ${clip(step, 200)}`)
    }

    for (const question of h.openQuestions.slice(0, 3)) {
      lines.push(`- ${w.openQuestions}: ${clip(question, 200)}`)
    }
  }

  if (snap.recent.length > 0) {
    lines.push('', `**${w.recent}**`)

    for (const ref of snap.recent.slice(0, 6)) {
      lines.push(`- ${clip(ref.title, 90)} (${kindOf(w, ref.kind)}, ${agoOf(w, now, ref.updatedAt)})`)
    }
  }

  return lines.join('\n')
}

export function searchText(w: Words, query: string, hits: readonly MuninnHit[], everywhere: boolean): string {
  if (hits.length === 0) {
    return w.noResults(query)
  }

  return [
    `**${w.results(hits.length, query, everywhere)}**`,
    ...hits.slice(0, 8).map(hit => `- **${clip(hit.title, 90)}** (${kindOf(w, hit.kind)}${everywhere ? ` · ${hit.project}` : ''}): ${clip(hit.snippet, 220)}`),
  ].join('\n')
}

// --- The /mods hub tab (claude-mods-hub, PROTOCOL.md)

export type PanelInput = {
  lang: MuninnLang
  snap: MuninnSnapshot
  now: number
  query: string
  hits: readonly MuninnHit[]
  everywhere: boolean
  pinned: string | undefined
  statusLine: boolean
  toast: boolean
}

async function hubPanel($: EngineInterface, args: MuninnPanelArgs): Promise<MuninnPanel> {
  const lang: MuninnLang = args.lang === 'en' ? 'en' : 'pt'

  if ((await langOf($)) !== lang) {
    $.clock.after(0, () => void $.store.set('lang', lang))
  }

  const snap = await snapshotForPanel($)

  return panelOf({
    lang,
    snap,
    now: await $.clock.now(),
    query: await read($, queryAtom),
    hits: await read($, resultsAtom),
    everywhere: await read($, everywhereAtom),
    pinned: (await pinsOf($))[snap.root],
    statusLine: await settingOf($, 'statusLine'),
    toast: await settingOf($, 'toast'),
  })
}

// The tab, from one snapshot: what the hub draws, in the hub's own items.
export function panelOf({ lang, snap, now, query, hits, everywhere, pinned, statusLine, toast }: PanelInput): MuninnPanel {
  const w = wordsOf(lang)
  const sections: MuninnSection[] = []

  if (!snap.online) {
    sections.push({
      id: 'now',
      title: lang === 'pt' ? 'Agora' : 'Now',
      items: [
        { kind: 'text', text: snap.error === 'unauthorized' ? w.unauthorizedHint : w.offlineHint(DEFAULT_SERVER), tone: 'err' },
        { kind: 'action', id: 'refresh', label: w.refresh },
        { kind: 'action', id: 'restart', label: w.restart, primary: true },
      ],
    })

    return { title: w.title, summary: snap.error === 'unauthorized' ? w.unauthorized : w.offline, tone: 'err', sections, refreshMs: 30_000 }
  }

  const nowItems: MuninnItem[] = [{ kind: 'info', label: w.project, value: snap.scope === null ? w.nothingHere(snap.repo) : whereOf(snap), ...(snap.scope === null ? { tone: 'muted' as const } : {}) }]

  if (snap.counts) {
    nowItems.push({ kind: 'info', label: w.memory, value: w.counts(snap.counts.pages, snap.counts.sessions, snap.counts.observations) })
  }

  if (snap.week) {
    nowItems.push({ kind: 'info', label: w.week, value: w.weekLine(snap.week.sessions, snap.week.observations) })
  }

  if (snap.scope !== null) {
    nowItems.push({ kind: 'info', label: w.last, value: agoOf(w, now, snap.lastAt) })
  }

  if (snap.handoff !== null) {
    nowItems.push({ kind: 'info', label: w.handoff, value: handoffLine(w, snap, now) ?? '', tone: snap.handoff.state === 'open' ? 'warn' : 'ok' })

    if (snap.handoff.summary) {
      nowItems.push({ kind: 'text', text: clip(snap.handoff.summary, 240) })
    }
  }

  nowItems.push({ kind: 'action', id: 'refresh', label: w.refresh }, { kind: 'action', id: 'web', label: w.web }, { kind: 'action', id: 'open', label: lang === 'pt' ? 'Abrir o painel' : 'Open the pane', primary: true })
  sections.push({ id: 'now', title: lang === 'pt' ? 'Agora' : 'Now', items: nowItems })

  const searchItems: MuninnItem[] = [{ kind: 'input', id: 'search', label: w.search, help: w.searchHelp, placeholder: w.placeholder, submitLabel: w.go }]

  if (query !== '') {
    searchItems.push({ kind: 'text', text: hits.length === 0 ? w.noResults(query) : w.results(hits.length, query, everywhere) })

    hits.slice(0, 8).forEach((hit, i) => {
      searchItems.push({ kind: 'action', id: `hit:${i}`, label: w.open, title: clip(hit.title, 70), help: clip(`${kindOf(w, hit.kind)} · ${hit.snippet}`, 140) })
    })
  }

  sections.push({ id: 'search', title: w.search, items: searchItems })
  sections.push({
    id: 'recent',
    title: w.recent,
    items:
      snap.recent.length === 0
        ? [{ kind: 'text', text: snap.scope === null ? w.nothingHereHint : w.noRecent }]
        : snap.recent.map((ref, i): MuninnItem => ({ kind: 'action', id: `recent:${i}`, label: w.open, title: clip(ref.title, 70), help: `${kindOf(w, ref.kind)} · ${agoOf(w, now, ref.updatedAt)}` })),
  })
  sections.push({
    id: 'settings',
    title: w.settings,
    items: [
      {
        kind: 'choice',
        id: 'project',
        label: w.pickProject,
        help: w.projectHelp,
        value: pinned ?? 'auto',
        options: [{ value: 'auto', label: w.auto(snap.repo) }, ...snap.projects.map(p => ({ value: `${p.workspace}/${p.project}`, label: `${p.workspace} / ${p.project}` }))],
      },
      { kind: 'toggle', id: 'statusLine', label: w.statusLine, help: w.statusLineHelp, value: statusLine },
      { kind: 'toggle', id: 'toast', label: w.toastSetting, help: w.toastSettingHelp, value: toast },
      { kind: 'action', id: 'copy', label: w.copyPassword, title: w.web, help: w.webHelp },
    ],
  })

  const handoffWord = snap.handoff === null ? null : `${w.handoff.toLowerCase()} ${w.handoffState(snap.handoff.state, isFresh(snap.handoff, now))}`
  const summary = snap.scope === null ? w.nothingHere(snap.repo) : w.summary(snap.scope.project, snap.counts?.pages ?? 0, handoffWord)
  const tone = snap.scope === null ? 'muted' : snap.handoff?.state === 'open' ? 'warn' : 'ok'

  return { title: w.title, summary, tone, sections, refreshMs: 30_000 }
}

async function hubAct($: EngineInterface, args: MuninnActArgs): Promise<MuninnActResult> {
  const w = wordsOf(await langOf($))
  const [id, at] = args.id.split(':')
  const index = Number(at)

  switch (id) {
    case 'open':
      await update($, viewAtom, () => 'home')
      await openPane($, w)

      return {}
    case 'refresh':
      await refresh($)

      return { message: w.refreshed }
    case 'web':
      return (await openWeb($)) ? {} : { message: w.notCopied }
    case 'copy':
      return { message: (await copyPassword($)) ? w.copied : w.notCopied }
    case 'restart':
      return { message: (await restartServer($)) ? w.restarted : w.notRestarted }
    case 'search':
      if (args.value) {
        await runSearch($, args.value, false)
      }

      return {}
    case 'hit':
    case 'recent': {
      const list: readonly MuninnPageRef[] = id === 'hit' ? await read($, resultsAtom) : ((await read($, snapshotAtom))?.recent ?? [])
      const ref = list[index]

      if (ref !== undefined) {
        await openPage($, ref)
        await openPane($, w)
      }

      return {}
    }
    case 'project':
      await setPin($, args.value ?? 'auto')

      return {}
    case 'statusLine':
    case 'toast': {
      await $.store.set(id, args.value === 'on')
      const snap = await read($, snapshotAtom)

      if (snap !== null) {
        await showStatus($, snap)
      }

      return {}
    }
    default:
      return {}
  }
}

// --- The pane

type Press = (work: () => Promise<unknown>) => () => void

function header(k: Kit, w: Words, snap: MuninnSnapshot | null, busy: boolean): RenderElement {
  const { Box } = k.ui
  const state: [string, KitTone] | null =
    snap === null ? null : snap.online ? [`${w.online}${snap.version ? ` · ${snap.version}` : ''}`, 'ok'] : [snap.error === 'unauthorized' ? w.unauthorized : w.offline, 'err']

  return (
    <Box key="muninn-header" flexDirection="row" columnGap={1} alignItems="center" paddingX={1}>
      {icon(k, 'raven', 'accent', 18, '◆')}
      {text(k, w.title, undefined, { bold: true })}
      {text(k, `· ${w.tagline}`, 'faint')}
      <Box flexGrow={1} />
      {busy ? text(k, w.loading, 'faint') : null}
      {state === null ? null : status(k, state[0], state[1])}
    </Box>
  )
}

function handoffNotice(k: Kit, w: Words, snap: MuninnSnapshot, now: number): RenderElement | null {
  const h = snap.handoff

  if (h === null) {
    return null
  }

  const body = [
    ...(h.summary ? [text(k, clip(h.summary, 600), undefined, { key: 'handoff-summary' })] : []),
    ...h.nextSteps.slice(0, 5).map((step, i) => text(k, `→ ${clip(step, 300)}`, 'muted', { key: `handoff-next-${i}` })),
    ...h.openQuestions.slice(0, 3).map((question, i) => text(k, `? ${clip(question, 300)}`, 'muted', { key: `handoff-open-${i}` })),
  ]
  const tone: KitTone = h.state === 'open' ? 'warn' : isFresh(h, now) ? 'ok' : 'muted'

  return notice(k, 'muninn-handoff', tone, `${w.handoff} ${handoffLine(w, snap, now)}`, body.length > 0 ? body : undefined, undefined, 'replay')
}

function homeView($: EngineInterface, k: Kit, w: Words, snap: MuninnSnapshot, now: number, pinned: string | undefined, settings: { statusLine: boolean; toast: boolean }, press: Press, surface: RenderSurface): RenderElement {
  if (!snap.online) {
    return notice(
      k,
      'muninn-offline',
      'err',
      snap.error === 'unauthorized' ? w.unauthorized : w.offline,
      snap.error === 'unauthorized' ? w.unauthorizedHint : w.offlineHint(DEFAULT_SERVER),
      [
        action(k, 'muninn-retry', w.refresh, press(() => refresh($))),
        action(k, 'muninn-restart', w.restart, press(async () => $.ui.toast((await restartServer($)) ? w.restarted : w.notRestarted)), { primary: true }),
      ],
    )
  }

  const search = section(k, 'muninn-search', w.search, [
    field(k, 'muninn-q', w.searchHelp, w.placeholder, query => query !== '' && press(() => runSearch($, query, false))(), { submitLabel: w.go }),
  ])

  const memory =
    snap.scope === null
      ? notice(k, 'muninn-nothing', 'muted', w.nothingHere(snap.repo), w.nothingHereHint)
      : section(
          k,
          'muninn-memory',
          w.memory,
          [
            value(k, w.project, whereOf(snap), undefined, 'muninn-v-project'),
            ...(snap.counts ? [value(k, w.memory, w.counts(snap.counts.pages, snap.counts.sessions, snap.counts.observations), undefined, 'muninn-v-counts')] : []),
            ...(snap.week ? [value(k, w.week, w.weekLine(snap.week.sessions, snap.week.observations), undefined, 'muninn-v-week')] : []),
            value(k, w.last, agoOf(w, now, snap.lastAt), undefined, 'muninn-v-last'),
          ],
          undefined,
          true,
        )

  const recent =
    snap.scope === null
      ? null
      : section(
          k,
          'muninn-recent',
          w.recent,
          snap.recent.length === 0
            ? [empty(k, 'muninn-no-recent', w.noRecent)]
            : snap.recent.map((ref, i) =>
                row(k, {
                  key: `muninn-recent-${i}`,
                  label: clip(ref.title, 90),
                  help: `${kindOf(w, ref.kind)} · ${agoOf(w, now, ref.updatedAt)}`,
                  icon: ref.kind === 'session' ? 'clock' : 'file',
                  end: action(k, `muninn-recent-open-${i}`, w.open, press(() => openPage($, ref))),
                }),
              ),
        )

  const options = [{ value: 'auto', label: w.auto(snap.repo) }, ...snap.projects.map(p => ({ value: `${p.workspace}/${p.project}`, label: `${p.workspace} / ${p.project} (${p.pages})` }))]
  const toggleWords = { on: w.on, off: w.off, turnOn: w.turnOn, turnOff: w.turnOff }

  const more = section(k, 'muninn-more', w.more, [
    row(k, { key: 'muninn-project', label: w.pickProject, help: w.projectHelp, icon: 'folder', below: picker(k, 'muninn-pick', pinned ?? 'auto', options, choice => press(() => setPin($, choice))()) }),
    row(k, {
      key: 'muninn-web',
      label: w.web,
      help: w.webHelp,
      icon: 'external',
      end: [action(k, 'muninn-copy', w.copyPassword, press(async () => $.ui.toast((await copyPassword($, surface)) ? w.copied : w.notCopied))), action(k, 'muninn-open-web', w.web, press(() => openWeb($)))],
    }),
    row(k, { key: 'muninn-status', label: w.statusLine, help: w.statusLineHelp, end: toggle(k, 'muninn-t-status', settings.statusLine, next => press(() => hubAct($, { id: 'statusLine', value: next ? 'on' : 'off' }))(), toggleWords) }),
    row(k, { key: 'muninn-toast', label: w.toastSetting, help: w.toastSettingHelp, end: toggle(k, 'muninn-t-toast', settings.toast, next => press(() => hubAct($, { id: 'toast', value: next ? 'on' : 'off' }))(), toggleWords) }),
    row(k, { key: 'muninn-refresh', label: w.refresh, icon: 'refresh', end: action(k, 'muninn-refresh-now', w.refresh, press(() => refresh($))) }),
  ])

  return stack(k, 'muninn-home', [handoffNotice(k, w, snap, now), search, memory, recent, more])
}

function searchView($: EngineInterface, k: Kit, w: Words, query: string, hits: readonly MuninnHit[], everywhere: boolean, now: number, press: Press): RenderElement {
  const { Box } = k.ui
  const list =
    hits.length === 0
      ? empty(k, 'muninn-no-hits', w.noResults(query))
      : section(
          k,
          'muninn-hits',
          w.results(hits.length, query, everywhere),
          hits.map((hit, i) =>
            row(k, {
              key: `muninn-hit-${i}`,
              label: clip(hit.title, 90),
              help: clip(`${kindOf(w, hit.kind)}${everywhere ? ` · ${hit.workspace} / ${hit.project}` : ''}${hit.updatedAt ? ` · ${agoOf(w, now, hit.updatedAt)}` : ''} · ${hit.snippet}`, 260),
              icon: 'search',
              end: action(k, `muninn-hit-open-${i}`, w.open, press(() => openPage($, hit))),
            }),
          ),
        )

  return stack(k, 'muninn-search-view', [
    <Box key="muninn-search-nav" flexDirection="row" columnGap={1} alignItems="center" paddingX={1}>
      {action(k, 'muninn-back', `← ${w.back}`, press(() => update($, viewAtom, () => 'home')))}
      {action(k, 'muninn-scope', everywhere ? w.here : w.everywhere, press(() => runSearch($, query, !everywhere)))}
    </Box>,
    field(k, 'muninn-q2', w.search, w.placeholder, next => next !== '' && press(() => runSearch($, next, everywhere))(), { submitLabel: w.go, value: query }),
    list,
  ])
}

export const register: Register = on => {
  // Adds `$.muninn`: its tab in the /mods pane.
  on('engine.create', async ($, e, next) => {
    const built = await next(e)

    return { ...built, muninn: { panel: async () => ({ title: '', sections: [] }), act: async () => ({}) } }
  })
  on('muninn.panel', async ($, e) => ({ value: await hubPanel($, e) }))
  on('muninn.act', async ($, e) => ({ value: await hubAct($, e) }))

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const lang = await langOf($)
    await update($, langAtom, () => lang)
    await $.command.register({ name: 'muninn', description: wordsOf(lang).command, argumentHint: wordsOf(lang).argHint, immediate: true })
    // After the session's own start, so ai-memory's hook has handed the handoff over.
    $.clock.after(800, () => void greet($).catch(() => undefined))
    $.clock.every(POLL_MS, () => void refresh($).catch(() => undefined))

    return started
  })

  // A turn may have written memory: look again once it settles, at most every few seconds.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId === undefined) {
      $.clock.after(2000, () =>
        void (async () => {
          const held = await read($, snapshotAtom)

          if (held === null || (await $.clock.now()) - held.at > 5000) {
            await refresh($)
          }
        })().catch(() => undefined),
      )
    }

    return done
  })

  on('command.run', { command: 'muninn' }, async ($, e) => {
    const w = wordsOf(await langOf($))
    const query = e.args.trim()

    if (query === '') {
      const open = (await $.ui.panes()).find(pane => pane.id === PANE)

      if (open?.isShown) {
        await $.ui.close({ id: PANE })

        return {}
      }

      await update($, viewAtom, () => 'home')
    }

    const isPlaced = await openPane($, w)
    // VS Code and headless runs attach no surface that draws panes, whatever the open answered.
    const surfaces = await $.session.surfaces()
    const drawn = isPlaced && surfaces.some(surface => surface === 'terminal' || surface === 'desktop')
    const snap = await refresh($)

    if (query !== '') {
      await runSearch($, query, snap.scope === null)
    }

    if (drawn) {
      return {}
    }

    // No surface draws the pane here: the same, as text.
    return {
      text: query === '' ? dashboardText(w, snap, await $.clock.now()) : searchText(w, query, await read($, resultsAtom), await read($, everywhereAtom)),
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const lang = await langOf($)
    const w = wordsOf(lang)

    if (!('Input' in ui)) {
      return <ui.Text>{w.textOnly}</ui.Text>
    }

    const k = kitOf(ui, toneOf(await skinOf($)), e.surface, e.props.bodyColumns)
    const snap = await read($, snapshotAtom)
    const busy = await read($, busyAtom)
    const view = await read($, viewAtom)
    const now = await $.clock.now()

    const press: Press = work => () =>
      void work().catch(error => {
        $.ui.toast(`Muninn: ${messageOf(error)}`)
      })

    const top = header(k, w, snap, busy)

    if (snap === null) {
      return stack(k, 'muninn', [top, empty(k, 'muninn-waiting', w.loading)])
    }

    if (view === 'page') {
      const page = await read($, pageAtom)

      if (page !== null) {
        const { Box, Markdown } = ui

        return stack(k, 'muninn', [
          top,
          <Box key="muninn-page-nav" flexDirection="row" columnGap={1} alignItems="center" paddingX={1}>
            {action(
              k,
              'muninn-page-back',
              `← ${w.back}`,
              press(async () => {
                const query = await read($, queryAtom)
                await update($, viewAtom, () => (query === '' ? 'home' : 'search'))
              }),
            )}
            {action(k, 'muninn-page-web', w.web, press(() => openWeb($, page)))}
          </Box>,
          <Box key="muninn-page-meta" flexDirection="column" paddingX={1}>
            {text(k, page.title, undefined, { bold: true })}
            {text(k, `${kindOf(w, page.kind)} · ${page.workspace} / ${page.project} · ${agoOf(w, now, page.updatedAt)}`, 'muted')}
          </Box>,
          <Box key="muninn-page-body" flexDirection="column" paddingX={1}>
            <Markdown key="muninn-page-md" text={page.body} />
          </Box>,
        ])
      }
    }

    if (view === 'search') {
      return stack(k, 'muninn', [top, searchView($, k, w, await read($, queryAtom), await read($, resultsAtom), await read($, everywhereAtom), now, press)])
    }

    const settings = { statusLine: await settingOf($, 'statusLine'), toast: await settingOf($, 'toast') }

    return stack(k, 'muninn', [top, homeView($, k, w, snap, now, (await pinsOf($))[snap.root], settings, press, e.surface), text(k, w.footer, 'faint', { key: 'muninn-footer' })])
  })
}
