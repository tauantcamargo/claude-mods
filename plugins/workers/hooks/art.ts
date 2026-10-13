// The look of the Salão dos Deuses: Norse and Roman pantheons, carved stone,
// gold leaf, runes and laurel. Pure functions only (no engine calls), so the
// drawings can be rendered and checked outside a session.

import type { Check, Worker } from '../types'

export type Pantheon = 'aesir' | 'vanir' | 'romani'

export type God = {
  name: string
  pantheon: Pantheon
  domain: string
  /** Norse: the god's rune (key of RUNES). Roman: the initial on the scutum. */
  sigil: string
}

// --- elder futhark, drawn as strokes in a 10 × 16 box (fonts need not carry them)

export const RUNES: Record<string, { char: string; d: string }> = {
  fehu: { char: 'ᚠ', d: 'M3 0V16M3 4L9 0M3 8L9 4' },
  uruz: { char: 'ᚢ', d: 'M2 16V0L8 5V16' },
  thurisaz: { char: 'ᚦ', d: 'M3 0V16M3 4L8 8L3 12' },
  ansuz: { char: 'ᚨ', d: 'M3 0V16M3 0L9 4M3 5L9 9' },
  raidho: { char: 'ᚱ', d: 'M3 16V0L8 4L3 8L8 16' },
  kenaz: { char: 'ᚲ', d: 'M8 1L3 8L8 15' },
  gebo: { char: 'ᚷ', d: 'M1 1L9 15M9 1L1 15' },
  wunjo: { char: 'ᚹ', d: 'M3 16V0L8 4L3 8' },
  hagalaz: { char: 'ᚺ', d: 'M2 0V16M8 0V16M2 5L8 11' },
  naudiz: { char: 'ᚾ', d: 'M5 0V16M2 5L8 10' },
  isa: { char: 'ᛁ', d: 'M5 0V16' },
  jera: { char: 'ᛃ', d: 'M4 2L1 6L4 10M6 6L9 10L6 14' },
  tiwaz: { char: 'ᛏ', d: 'M5 0V16M1 4L5 0L9 4' },
  berkano: { char: 'ᛒ', d: 'M3 0V16M3 0L8 4L3 8L8 12L3 16' },
  ehwaz: { char: 'ᛖ', d: 'M2 16V0L5 5L8 0V16' },
  mannaz: { char: 'ᛗ', d: 'M2 16V0L8 6M8 16V0L2 6' },
  laguz: { char: 'ᛚ', d: 'M3 16V0L8 5' },
  ingwaz: { char: 'ᛜ', d: 'M5 3L9 8L5 13L1 8Z' },
  othala: { char: 'ᛟ', d: 'M5 1L9 6L2 15M5 1L1 6L8 15' },
  sowilo: { char: 'ᛊ', d: 'M7 0L3 6L7 10L3 16' },
  algiz: { char: 'ᛉ', d: 'M5 0V16M1 2L5 7L9 2' },
  dagaz: { char: 'ᛞ', d: 'M1 2V14L9 2V14L1 2' },
}

const RUNE_ORDER = Object.keys(RUNES)

export const PANTHEON: readonly God[] = [
  { name: 'Odin', pantheon: 'aesir', domain: 'pai de todos', sigil: 'ansuz' },
  { name: 'Thor', pantheon: 'aesir', domain: 'senhor do trovão', sigil: 'thurisaz' },
  { name: 'Tyr', pantheon: 'aesir', domain: 'guerra e justiça', sigil: 'tiwaz' },
  { name: 'Frigg', pantheon: 'aesir', domain: 'presságio', sigil: 'berkano' },
  { name: 'Heimdall', pantheon: 'aesir', domain: 'vigia de Bifröst', sigil: 'hagalaz' },
  { name: 'Baldur', pantheon: 'aesir', domain: 'a luz', sigil: 'sowilo' },
  { name: 'Loki', pantheon: 'aesir', domain: 'astúcia e fogo', sigil: 'kenaz' },
  { name: 'Idun', pantheon: 'aesir', domain: 'renovação', sigil: 'jera' },
  { name: 'Bragi', pantheon: 'aesir', domain: 'poesia', sigil: 'wunjo' },
  { name: 'Vidar', pantheon: 'aesir', domain: 'o silêncio', sigil: 'dagaz' },
  { name: 'Forseti', pantheon: 'aesir', domain: 'conciliação', sigil: 'mannaz' },
  { name: 'Sif', pantheon: 'aesir', domain: 'campos dourados', sigil: 'gebo' },
  { name: 'Ullr', pantheon: 'aesir', domain: 'caça e inverno', sigil: 'uruz' },
  { name: 'Mimir', pantheon: 'aesir', domain: 'memória', sigil: 'othala' },
  { name: 'Hermod', pantheon: 'aesir', domain: 'mensageiro', sigil: 'raidho' },
  { name: 'Eir', pantheon: 'aesir', domain: 'cura', sigil: 'algiz' },
  { name: 'Skadi', pantheon: 'aesir', domain: 'gelo e montanha', sigil: 'isa' },
  { name: 'Hel', pantheon: 'aesir', domain: 'o submundo', sigil: 'naudiz' },
  { name: 'Freyr', pantheon: 'vanir', domain: 'colheita e paz', sigil: 'fehu' },
  { name: 'Freya', pantheon: 'vanir', domain: 'magia e seiðr', sigil: 'laguz' },
  { name: 'Njord', pantheon: 'vanir', domain: 'mares e ventos', sigil: 'ehwaz' },
  { name: 'Nerthus', pantheon: 'vanir', domain: 'a terra', sigil: 'ingwaz' },
  { name: 'Júpiter', pantheon: 'romani', domain: 'rei dos deuses', sigil: 'I' },
  { name: 'Juno', pantheon: 'romani', domain: 'rainha do Olimpo', sigil: 'I' },
  { name: 'Minerva', pantheon: 'romani', domain: 'sabedoria e estratégia', sigil: 'M' },
  { name: 'Marte', pantheon: 'romani', domain: 'a guerra', sigil: 'M' },
  { name: 'Vênus', pantheon: 'romani', domain: 'amor e beleza', sigil: 'V' },
  { name: 'Apolo', pantheon: 'romani', domain: 'luz e profecia', sigil: 'A' },
  { name: 'Diana', pantheon: 'romani', domain: 'caça e lua', sigil: 'D' },
  { name: 'Mercúrio', pantheon: 'romani', domain: 'mensageiro', sigil: 'M' },
  { name: 'Vulcano', pantheon: 'romani', domain: 'a forja', sigil: 'V' },
  { name: 'Netuno', pantheon: 'romani', domain: 'os mares', sigil: 'N' },
  { name: 'Vesta', pantheon: 'romani', domain: 'o lar', sigil: 'V' },
  { name: 'Ceres', pantheon: 'romani', domain: 'a colheita', sigil: 'C' },
  { name: 'Baco', pantheon: 'romani', domain: 'o vinho', sigil: 'B' },
  { name: 'Jano', pantheon: 'romani', domain: 'portais e começos', sigil: 'I' },
  { name: 'Saturno', pantheon: 'romani', domain: 'o tempo', sigil: 'S' },
  { name: 'Plutão', pantheon: 'romani', domain: 'o submundo', sigil: 'P' },
  { name: 'Aurora', pantheon: 'romani', domain: 'a alvorada', sigil: 'A' },
  { name: 'Fortuna', pantheon: 'romani', domain: 'a sorte', sigil: 'F' },
  { name: 'Vitória', pantheon: 'romani', domain: 'a vitória', sigil: 'V' },
  { name: 'Justitia', pantheon: 'romani', domain: 'a justiça', sigil: 'I' },
  { name: 'Concórdia', pantheon: 'romani', domain: 'a harmonia', sigil: 'C' },
  { name: 'Luna', pantheon: 'romani', domain: 'a lua', sigil: 'L' },
] as const

export const GODS: readonly string[] = PANTHEON.map(g => g.name)

/** Gods whose domain fits the kind of task, tried before the rest. */
const AFFINITY: readonly [RegExp, readonly string[]][] = [
  [/explor|search|find|busca|investig|pesquis|research/i, ['Odin', 'Heimdall', 'Mimir', 'Mercúrio', 'Diana', 'Jano', 'Hermod']],
  [/plan|design|arquitet|strateg/i, ['Minerva', 'Frigg', 'Odin', 'Júpiter', 'Saturno', 'Forseti']],
  [/review|revis|audit|verif|check/i, ['Tyr', 'Justitia', 'Forseti', 'Heimdall', 'Vidar']],
  [/test|qa\b|e2e/i, ['Vulcano', 'Ullr', 'Diana', 'Skadi']],
  [/fix|bug|debug|corrig/i, ['Thor', 'Marte', 'Eir', 'Vulcano']],
  [/doc|readme|write|escrev/i, ['Bragi', 'Apolo', 'Mimir']],
  [/refactor|clean|limp|migra/i, ['Idun', 'Vesta', 'Njord', 'Ceres']],
  [/deploy|release|ship|build/i, ['Mercúrio', 'Hermod', 'Vitória', 'Fortuna']],
]

export const godOf = (name: string): God => {
  const base = name.replace(/ [IVXLC]+$/, '')
  return PANTHEON.find(g => g.name === base) ?? { name, pantheon: 'aesir', domain: '', sigil: 'othala' }
}

export type PantheonChoice = 'both' | 'norse' | 'roman'

export function pickGod(used: readonly string[], seed: number, hint = '', only: PantheonChoice = 'both'): string {
  const allowed = PANTHEON.filter(g => only === 'both' || (only === 'roman') === (g.pantheon === 'romani')).map(g => g.name)
  const free = allowed.filter(g => !used.includes(g))
  for (const [re, names] of AFFINITY) {
    if (!re.test(hint)) continue
    const fit = names.filter(n => free.includes(n))
    if (fit.length > 0) return fit[Math.abs(seed) % fit.length] ?? fit[0]!
  }
  const pool = free.length > 0 ? free : allowed
  const base = pool[Math.abs(seed) % pool.length] ?? 'Odin'
  if (free.length > 0) return base
  const round = 1 + used.filter(u => u === base || u.startsWith(`${base} `)).length
  return `${base} ${roman(round)}`
}

// --- words and numbers

/** Roman numerals; nulla (N) for zero, as the computists wrote it. */
export function roman(n: number): string {
  if (n <= 0) return 'N'
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [v, s] of map) while (n >= v) { out += s; n -= v }
  return out
}

export const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const hhmm = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export const elapsed = (from: number, to: number): string => {
  const s = Math.max(0, Math.round((to - from) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

export const progressOf = (w: Worker): number => {
  if (w.status !== 'running') return 1
  if (!w.stepTotal) return 0
  return Math.min(1, (w.stepDone ?? 0) / w.stepTotal)
}

export const pantheonLabel = (p: Pantheon): string => (p === 'romani' ? 'DI ROMANI' : p === 'vanir' ? 'VANIR' : 'ÆSIR')

// --- palette: soot, carved stone, gold leaf, frost steel, imperial crimson

export const C = {
  bg: '#13100d',
  stone: '#1c1814',
  stoneHi: '#262019',
  line: '#3b3127',
  parchment: '#ebe0c6',
  muted: '#a99c82',
  dim: '#6e6454',
  gold: '#c9a24a',
  goldHi: '#ecd28a',
  frost: '#9cc0d6',
  iron: '#56636c',
  crimson: '#a5322b',
  purple: '#7a3b6a',
  laurel: '#86a85e',
  fallen: '#b5483d',
  ember: '#dc9a3c',
} as const

const SERIF = "Cinzel, 'Trajan Pro', 'Cormorant SC', Georgia, 'Times New Roman', serif"
const BOOK = "'Cormorant Garamond', 'EB Garamond', Georgia, 'Times New Roman', serif"

export const accentOf = (god: God): string => (god.pantheon === 'romani' ? C.gold : god.pantheon === 'vanir' ? C.laurel : C.frost)

// --- small pieces

function rune(key: string, x: number, y: number, scale: number, color: string, width = 1.6): string {
  const r = RUNES[key] ?? RUNES.othala!
  return `<path transform="translate(${x} ${y}) scale(${scale})" d="${r.d}" fill="none" stroke="${color}" stroke-width="${width / scale}" stroke-linecap="square" stroke-linejoin="miter"/>`
}

/** A row of runes, as cut along the rim of a stone. */
function runeBand(x: number, y: number, width: number, color: string, scale = 0.7, gap = 13): string {
  const out: string[] = []
  for (let i = 0, cx = x; cx < x + width - 8; i++, cx += gap) {
    out.push(rune(RUNE_ORDER[i % RUNE_ORDER.length]!, cx, y, scale, color, 1.1))
    if (i % 6 === 5) {
      cx += gap
      out.push(`<circle cx="${cx + 3.5}" cy="${y + 5.6}" r="1.4" fill="${color}"/>`, `<circle cx="${cx + 3.5}" cy="${y + 1.6}" r="1.4" fill="${color}"/>`)
    }
  }
  return out.join('')
}

/** A sprig of laurel: leaves along an arc from angle a0 to a1 (radians), mirrored or not. */
function laurel(cx: number, cy: number, r: number, a0: number, a1: number, color: string, leaves = 9, size = 9): string {
  const out: string[] = [`<path d="M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 ${a1 > a0 ? 1 : 0} ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.2"/>`]
  for (let i = 0; i < leaves; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / leaves
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    const deg = (a * 180) / Math.PI + (a1 > a0 ? 90 : -90)
    for (const side of [-1, 1]) {
      out.push(`<ellipse cx="0" cy="${(-size / 2).toFixed(1)}" rx="${(size / 3.6).toFixed(1)}" ry="${(size / 2).toFixed(1)}" fill="${color}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(deg + side * 38).toFixed(0)})"/>`)
    }
  }
  return out.join('')
}

/** A Norse round shield: planks, iron rim, rivets, a boss. */
function roundShield(cx: number, cy: number, r: number, wood: string, rim: string, boss: string): string {
  const planks = Array.from({ length: 5 }, (_, i) => {
    const x = cx - r + ((i + 1) * 2 * r) / 6
    const h = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2))
    return `<line x1="${x.toFixed(1)}" y1="${(cy - h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(cy + h).toFixed(1)}" stroke="#00000055" stroke-width="1.2"/>`
  }).join('')
  const rivets = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    return `<circle cx="${(cx + (r - 3) * Math.cos(a)).toFixed(1)}" cy="${(cy + (r - 3) * Math.sin(a)).toFixed(1)}" r="1.3" fill="${C.goldHi}"/>`
  }).join('')
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${wood}"/>${planks}` +
    `<circle cx="${cx}" cy="${cy}" r="${r - 1.5}" fill="none" stroke="${rim}" stroke-width="3.5"/>${rivets}` +
    (boss === 'none' ? '' : `<circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="${boss}" stroke="${C.goldHi}" stroke-width="1.2"/>`)
}

/** A Roman scutum: tall, curved, with a gold border and boss. */
function scutum(cx: number, cy: number, w: number, h: number, field: string): string {
  const x = cx - w / 2, y = cy - h / 2
  const k = w * 0.16
  const body = `M${x + k} ${y} Q${cx} ${y - 5} ${x + w - k} ${y} Q${x + w + 3} ${cy} ${x + w - k} ${y + h} Q${cx} ${y + h + 5} ${x + k} ${y + h} Q${x - 3} ${cy} ${x + k} ${y} Z`
  return `<path d="${body}" fill="${field}" stroke="${C.gold}" stroke-width="2.2"/>` +
    `<path d="${body}" fill="none" stroke="${C.goldHi}" stroke-width="0.8" transform="translate(${cx} ${cy}) scale(0.84) translate(${-cx} ${-cy})"/>` +
    `<line x1="${cx}" y1="${y + 6}" x2="${cx}" y2="${y + h - 6}" stroke="${C.gold}" stroke-width="1.2" opacity="0.7"/>`
}

/** The god's emblem: a round shield with its rune, or a scutum with its initial and laurel. */
function emblem(god: God, cx: number, cy: number, size: number, status: Worker['status']): string {
  const mark = status === 'running' ? C.ember : status === 'done' ? C.laurel : C.fallen
  const pip = `<path d="M${cx + size * 0.62} ${cy + size * 0.5}l5 -5l5 5l-5 5z" fill="${mark}" stroke="${C.bg}" stroke-width="1.5"/>`
  if (god.pantheon === 'romani') {
    return laurel(cx, cy, size * 0.82, Math.PI * 0.62, Math.PI * 1.38, C.laurel, 5, size * 0.26) +
      laurel(cx, cy, size * 0.82, Math.PI * 0.38, -Math.PI * 0.38, C.laurel, 5, size * 0.26) +
      scutum(cx, cy, size * 0.9, size * 1.2, god.name === 'Vênus' || god.name === 'Juno' ? C.purple : C.crimson) +
      `<circle cx="${cx}" cy="${cy}" r="${size * 0.22}" fill="${C.stone}" stroke="${C.gold}" stroke-width="1.4"/>` +
      `<text x="${cx}" y="${cy + size * 0.12}" text-anchor="middle" fill="${C.goldHi}" font-family="${SERIF}" font-size="${size * 0.32}" font-weight="700">${esc(god.sigil)}</text>` + pip
  }
  const r = size * 0.62
  const s = (r * 1.15) / 16
  return roundShield(cx, cy, r, god.pantheon === 'vanir' ? '#3a4a2c' : '#2c3a44', C.iron, 'none') +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#0000004d"/>` +
    rune(god.sigil, cx - 5 * s, cy - 8 * s, s, accentOf(god), 2.6) + pip
}

/** Progress as notches cut in a stone: filled ones gilded, Roman milestones every fifth. */
function notches(x: number, y: number, p: number, color: string, isRoman: boolean): string {
  const filled = Math.round(p * 20)
  const out: string[] = [`<rect x="${x - 4}" y="${y - 4}" width="${20 * 13 + 4}" height="18" rx="2" fill="${C.bg}" stroke="${C.line}"/>`]
  for (let i = 0; i < 20; i++) {
    const nx = x + i * 13
    out.push(i < filled
      ? `<path d="M${nx} ${y}h9l-2 10h-5z" fill="${color}"/>`
      : `<path d="M${nx} ${y}h9l-2 10h-5z" fill="none" stroke="${C.line}"/>`)
    if (isRoman && (i + 1) % 5 === 0) {
      out.push(`<text x="${nx + 4.5}" y="${y + 24}" text-anchor="middle" fill="${C.dim}" font-family="${SERIF}" font-size="8">${roman(i + 1)}</text>`)
    }
  }
  return out.join('')
}

const frame = (w: number, h: number, inner = true): string =>
  `<defs><linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.stoneHi}"/><stop offset="1" stop-color="${C.stone}"/></linearGradient></defs>` +
  `<rect width="${w}" height="${h}" rx="6" fill="url(#st)"/>` +
  `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="5" fill="none" stroke="${C.line}" stroke-width="2"/>` +
  (inner ? `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity="0.55"/>` : '')

const corners = (w: number, h: number): string =>
  [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]
    .map(([x, y]) => `<path d="M${x} ${y! - 4}l4 4l-4 4l-4 -4z" fill="${C.gold}"/>`).join('')

// --- the pane's drawings

export function heroSvg(project: string, list: readonly Worker[], t: number): string {
  const W = 920, H = 200
  const running = list.filter(w => w.status === 'running')
  const done = list.filter(w => w.status === 'done').length
  const fallen = list.filter(w => w.status === 'failed').length
  const saga = running.length
    ? `${running.map(w => w.god).join(', ')} ${running.length === 1 ? 'luta' : 'lutam'} por você agora.`
    : done ? `${roman(done)} triunfo${done === 1 ? '' : 's'} nesta jornada. O salão descansa.` : 'O salão aguarda. Convoque um subagente e um deus atende.'
  const stat = (x: number, label: string, n: number, color: string) =>
    `<rect x="${x}" y="134" width="150" height="40" rx="3" fill="${C.bg}" stroke="${color}" stroke-width="1.2"/>` +
    `<rect x="${x + 3}" y="137" width="144" height="34" rx="2" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>` +
    `<text x="${x + 14}" y="160" fill="${color}" font-family="${SERIF}" font-size="17" font-weight="700">${roman(n)}</text>` +
    `<text x="${x + 136}" y="159" text-anchor="end" fill="${C.muted}" font-family="${SERIF}" font-size="10" letter-spacing="1.5">${label}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${frame(W, H)}${corners(W, H)}
${runeBand(30, 14, W - 60, C.gold, 0.55, 11)}
<line x1="20" y1="30" x2="${W - 20}" y2="30" stroke="${C.line}"/>
${laurel(105, 110, 66, Math.PI * 0.58, Math.PI * 1.42, C.laurel, 9, 13)}
${laurel(105, 110, 66, Math.PI * 0.42, -Math.PI * 0.42, C.laurel, 9, 13)}
${roundShield(105, 110, 52, '#2c3a44', C.iron, C.stone)}
<text x="105" y="117" text-anchor="middle" fill="${C.goldHi}" font-family="${SERIF}" font-size="${running.length > 3 ? 15 : 20}" font-weight="700">${roman(running.length)}</text>
<text x="200" y="58" fill="${C.gold}" font-family="${SERIF}" font-size="11" letter-spacing="3">SALA·DEORVM · ${esc(project.toUpperCase())} · ${hhmm(t)} UTC</text>
<text x="200" y="96" fill="${C.goldHi}" font-family="${SERIF}" font-size="34" font-weight="700" letter-spacing="1">Salão dos Deuses</text>
<text x="200" y="120" fill="${C.parchment}" font-family="${BOOK}" font-size="16" font-style="italic">${esc(clip(saga, 80))}</text>
${stat(200, 'TRIUNFOS', done, C.laurel)}${stat(362, 'EM BATALHA', running.length, C.ember)}${stat(524, 'TOMBADOS', fallen, C.fallen)}
<text x="${W - 34}" y="70" text-anchor="end" fill="${C.dim}" font-family="${SERIF}" font-size="10" letter-spacing="3">ANNO</text>
<text x="${W - 34}" y="100" text-anchor="end" fill="${C.gold}" font-family="${SERIF}" font-size="26" font-weight="700" opacity="0.75">${roman(new Date(t).getUTCFullYear())}</text>
${rune('othala', W - 70, 118, 2, C.gold, 1.6)}
<text x="${W - 30}" y="186" text-anchor="end" fill="${C.dim}" font-family="${SERIF}" font-size="9" letter-spacing="3">OPERA · DEORVM · ÆSIR · VANIR · DI ROMANI</text>
</svg>`
}

export function bannerSvg(title: string, sub = ''): string {
  const W = 920, H = 34
  const tw = title.length * 15 + 36
  const l = W / 2 - tw / 2, r = W / 2 + tw / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<line x1="16" y1="17" x2="${l}" y2="17" stroke="${C.line}" stroke-width="1"/><line x1="${r}" y1="17" x2="${W - 16}" y2="17" stroke="${C.line}" stroke-width="1"/>
<path d="M${l - 2} 17l-6 -5l-6 5l6 5z" fill="${C.gold}"/><path d="M${r + 2} 17l6 -5l6 5l-6 5z" fill="${C.gold}"/>
<text x="${W / 2}" y="22" text-anchor="middle" fill="${C.gold}" font-family="${SERIF}" font-size="15" font-weight="700" letter-spacing="4">${esc(title)}</text>
${sub ? `<text x="${W - 16}" y="12" text-anchor="end" fill="${C.dim}" font-family="${SERIF}" font-size="9" letter-spacing="2">${esc(sub)}</text>` : ''}
</svg>`
}

const OMEN = {
  ok: { color: C.laurel, word: 'FAVORÁVEL', rune: 'sowilo' },
  warn: { color: C.fallen, word: 'MAU PRESSÁGIO', rune: 'naudiz' },
  wait: { color: C.ember, word: 'AGUARDANDO', rune: 'isa' },
} as const

export function oracleSvg(lines: readonly Check[], at: number): string {
  const W = 920, row = 26, H = 50 + Math.max(1, lines.length) * row
  const body = lines.map((l, i) => {
    const o = OMEN[l.level]
    const y = 44 + i * row
    return rune(o.rune, 30, y - 12, 0.9, o.color, 1.6) +
      `<text x="52" y="${y}" fill="${o.color}" font-family="${SERIF}" font-size="10" letter-spacing="1.5">${o.word}</text>` +
      `<text x="180" y="${y}" fill="${C.parchment}" font-family="${BOOK}" font-size="15">${esc(clip(l.text, 92))}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${frame(W, H, false)}
<text x="22" y="22" fill="${C.gold}" font-family="${SERIF}" font-size="11" letter-spacing="3">O ORÁCULO FALA · ${hhmm(at)} UTC</text>
<line x1="22" y1="28" x2="${W - 22}" y2="28" stroke="${C.line}"/>
${body}
</svg>`
}

export function workerCardSvg(w: Worker, t: number): string {
  const god = godOf(w.god)
  const isRoman = god.pantheon === 'romani'
  const accent = accentOf(god)
  const W = 452, H = 176
  const step = w.stepTotal ? `${roman(w.stepDone ?? 0)} / ${roman(w.stepTotal)}` : '—'
  const note = w.stepNote ? clip(w.stepNote, 44) : w.status === 'running' ? (isRoman ? 'marchando para a frente…' : 'afiando o machado…') : ''
  const sagaLabel = isRoman ? 'ÉDITO' : 'SAGA'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${frame(W, H)}
${isRoman ? `<rect x="6" y="6" width="${W - 12}" height="4" fill="${C.crimson}" opacity="0.85"/>` : runeBand(18, 9, W - 36, C.iron, 0.4, 9)}
${emblem(god, 56, 70, 46, w.status)}
<text x="110" y="50" fill="${C.parchment}" font-family="${SERIF}" font-size="21" font-weight="700" letter-spacing="1.5">${esc(w.god.toUpperCase())}</text>
<text x="110" y="68" fill="${accent}" font-family="${BOOK}" font-size="14" font-style="italic">${esc(god.domain ? (isRoman ? `deus de ${god.domain}` : god.domain) : '')}</text>
<text x="${W - 18}" y="34" text-anchor="end" fill="${C.dim}" font-family="${SERIF}" font-size="9" letter-spacing="2">${pantheonLabel(god.pantheon)}</text>
<text x="${W - 18}" y="50" text-anchor="end" fill="${C.dim}" font-family="${SERIF}" font-size="10">${esc(w.type)} · ${elapsed(w.startedAt, w.endedAt ?? t)}</text>
<text x="110" y="92" fill="${C.goldHi}" font-family="${BOOK}" font-size="15" font-weight="600">${esc(clip(w.topic, 44))}</text>
${notches(112, 104, progressOf(w), accent, isRoman)}
<text x="${W - 18}" y="113" text-anchor="end" fill="${C.muted}" font-family="${SERIF}" font-size="11">${step}</text>
<text x="110" y="${isRoman ? 140 : 134}" fill="${C.muted}" font-family="${BOOK}" font-size="13" font-style="italic">${esc(note)}</text>
<line x1="18" y1="148" x2="${W - 18}" y2="148" stroke="${C.line}"/>
<text x="20" y="166" fill="${C.gold}" font-family="${SERIF}" font-size="9" letter-spacing="2">${sagaLabel}</text>
<text x="66" y="166" fill="${C.parchment}" font-family="${BOOK}" font-size="14">${esc(clip(w.tldr ?? '— ainda não cantada —', 58))}</text>
</svg>`
}

export function doneCardSvg(w: Worker): string {
  const god = godOf(w.god)
  const ok = w.status === 'done'
  const isRoman = god.pantheon === 'romani'
  const color = ok ? C.laurel : C.fallen
  const verdict = ok ? (isRoman ? 'TRIUMPHUS' : 'VALHALLA') : 'TOMBOU'
  const W = 296, H = 78
  const mark = isRoman
    ? `<text x="30" y="47" text-anchor="middle" fill="${C.goldHi}" font-family="${SERIF}" font-size="20" font-weight="700">${esc(god.sigil)}</text>${laurel(30, 40, 19, Math.PI * 0.6, Math.PI * 1.4, ok ? C.laurel : C.dim, 4, 7)}${laurel(30, 40, 19, Math.PI * 0.4, -Math.PI * 0.4, ok ? C.laurel : C.dim, 4, 7)}`
    : rune(god.sigil, 30 - 5 * 1.4, 40 - 8 * 1.4, 1.4, ok ? accentOf(god) : C.fallen, 2.2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${frame(W, H, false)}<rect x="2" y="2" width="3" height="${H - 4}" fill="${color}"/>
${mark}
<text x="58" y="30" fill="${C.parchment}" font-family="${SERIF}" font-size="14" font-weight="700" letter-spacing="1">${esc(w.god.toUpperCase())}</text>
<text x="${W - 12}" y="29" text-anchor="end" fill="${color}" font-family="${SERIF}" font-size="9" letter-spacing="2">${verdict}</text>
<text x="58" y="50" fill="${C.goldHi}" font-family="${BOOK}" font-size="13">${esc(clip(w.topic, 34))}</text>
<text x="58" y="67" fill="${C.muted}" font-family="${BOOK}" font-size="12" font-style="italic">${esc(clip(w.tldr ?? '', 40))}</text>
</svg>`
}

/** The terminal's sigil for a god: its rune, or its initial between Roman points. */
export const glyphOf = (god: God): string => (god.pantheon === 'romani' ? `·${god.sigil}·` : (RUNES[god.sigil]?.char ?? 'ᛟ'))
