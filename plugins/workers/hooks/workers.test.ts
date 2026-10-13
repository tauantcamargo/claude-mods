import { expect, mock, test } from 'claude-code/testing'
import type { Plugin } from 'claude-code/testing'
import type { CommandRunInput } from 'claude-code'

import { extractTldr, GODS, pickGod } from './register'
import { PANTHEON } from './art'

const PLUGIN = 'workers'
const STEP = 'mcp__workers__step'
const pane = { title: '', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as const
const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }

test('pickGod never repeats a name while free ones remain', async () => {
  const used: string[] = []
  for (let i = 0; i < GODS.length; i++) used.push(pickGod(used, i * 7))
  expect(new Set(used).size).toBe(GODS.length)
  expect(pickGod(used, 3)).toMatch(/ II$/)
})

test('extractTldr reads the last TL;DR line, or falls back to the first line', async () => {
  expect(extractTldr('Fiz X.\n\nTL;DR: login corrigido e testado')).toBe('login corrigido e testado')
  expect(extractTldr('**TL;DR:** pronto')).toBe('pronto')
  expect(extractTldr('# Title\nResultado direto')).toBe('Resultado direto')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a subagent becomes a god-named worker with progress and TL;DR`, async ($, on) => {
    mock.clock(on)
    on('ui.open', () => ({ value: { isPlaced: true } }))
    let seen: { description: string; prompt: string } | undefined
    on('agent.spawn', (_$, e) => {
      seen = { description: e.description, prompt: e.prompt }
      return { model: 'claude-sonnet-5-5', agentId: 'a1' }
    })
    on('turn.complete', () => ({ text: '' }) as never)
    on('ui.toast', () => ({ value: undefined }) as never)

    await $.agent.spawn({ tool_use_id: 't1', prompt: 'fix it', description: 'fix login', subagentType: 'general-purpose', provider: 'engine', parentModel: 'm', background: false, fork: false } as never)
    expect(seen?.description).toMatch(/^\S+ · fix login$/)
    expect(seen?.prompt).toContain(STEP)
    const god = seen!.description.split(' · ')[0]!

    expect(await $.tool.call({ tool: STEP, agentId: 'a1', done: 1, total: 4, note: 'lendo código' } as never)).toMatchObject({ result: 'ok' })

    const bar = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band })
    expect(await bar.find({ key: 'workers-open' })).toBeDefined()

    await $.turn.complete({ answer: 'feito\nTL;DR: login ok', durationMs: 1, isAborted: false, turnId: 'x', agentId: 'a1', reason: 'answer' } as never)

    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'workers', props: pane })
    if (surface === 'terminal') {
      expect(await ui.find({ text: new RegExp(god) })).toBeDefined()
    } else {
      const drawn = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
      expect(drawn).toContain('login ok')
      expect(drawn).toContain('Salão dos Deuses')
      expect(drawn).not.toContain('[object')
    }
  })
}

test('gods come from the Norse and Roman pantheons, picked by the kind of task', async () => {
  expect(PANTHEON.every(g => ['aesir', 'vanir', 'romani'].includes(g.pantheon))).toBe(true)
  expect(['Thor', 'Marte', 'Eir', 'Vulcano']).toContain(pickGod([], 1, 'general-purpose fix login bug'))
  expect(['Odin', 'Heimdall', 'Mimir', 'Mercúrio', 'Diana', 'Jano', 'Hermod']).toContain(pickGod([], 2, 'Explore codebase'))
})

// Only another module can call a plugin's noun: this stand-in for the /mods hub answers two commands.
const HUB: Plugin = {
  name: 'hub',
  register(on) {
    on('command.run', { command: 'hubpanel' }, async ($, e) => ({
      text: JSON.stringify(await $.workers.panel({ lang: e.args === 'en' ? 'en' : 'pt', surface: 'terminal', columns: 80 })),
    }))
    on('command.run', { command: 'hubact' }, async ($, e) => {
      const [id, value] = String(e.args ?? '').split(' ')
      return { text: (await $.workers.act({ id: id ?? '', value })).message ?? '' }
    })
  },
}
const run = (command: string, args: string): CommandRunInput => ({ command, args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as CommandRunInput
const textOf = (r: unknown): string => String((r as { text?: string }).text ?? '')

test('the /mods hub tab: counts, actions, and the pantheon setting steers the next god', { plugins: [HUB] }, async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  const store = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: store.get((e as { key: string }).key) }) as never)
  on('store.set', (_$, e) => {
    store.set((e as { key: string }).key, (e as { value: unknown }).value)
    return { value: undefined } as never
  })
  let seen = ''
  on('agent.spawn', (_$, e) => {
    seen = e.description
    return { model: 'm', agentId: 'a2' }
  })

  const panel = JSON.parse(textOf(await $.command.run(run('hubpanel', 'pt'))))
  expect(panel.title).toBe('Workers')
  expect(panel.sections.map((s: { id: string }) => s.id)).toEqual(['hall', 'gods', 'settings'])

  expect(textOf(await $.command.run(run('hubact', 'pantheon roman')))).toContain('romanos')
  await $.agent.spawn({ tool_use_id: 't2', prompt: 'p', description: 'explore the repo', subagentType: 'Explore', provider: 'engine', parentModel: 'm', background: false, fork: false } as never)
  const god = seen.split(' · ')[0]!
  expect(PANTHEON.find(g => g.name === god)?.pantheon).toBe('romani')

  const after = JSON.parse(textOf(await $.command.run(run('hubpanel', 'en'))))
  expect(after.summary).toContain('1 in battle')
})
