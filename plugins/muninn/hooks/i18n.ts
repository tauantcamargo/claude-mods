import type { MuninnLang } from '../types'

// Every word Muninn draws or says. Portuguese is the default; the /mods hub asks for English
// when the person picks it there, and Muninn remembers the last language asked.
export type Words = {
  title: string
  tagline: string
  command: string
  argHint: string
  online: string
  offline: string
  unauthorized: string
  loading: string
  server: string
  project: string
  folder: string
  memory: string
  counts: (pages: number, sessions: number, observations: number) => string
  week: string
  weekLine: (sessions: number, observations: number) => string
  last: string
  never: string
  ago: (ms: number) => string
  handoff: string
  handoffState: (state: string, fresh: boolean) => string
  handoffFrom: (agent: string, when: string, state: string) => string
  nextSteps: string
  openQuestions: string
  noHandoff: string
  search: string
  searchHelp: string
  placeholder: string
  go: string
  results: (count: number, query: string, everywhere: boolean) => string
  noResults: (query: string) => string
  everywhere: string
  here: string
  recent: string
  noRecent: string
  open: string
  back: string
  pickProject: string
  auto: (repo: string) => string
  projectHelp: string
  refresh: string
  refreshed: string
  web: string
  webHelp: string
  copyPassword: string
  copied: string
  notCopied: string
  restart: string
  restarted: string
  notRestarted: string
  more: string
  settings: string
  statusLine: string
  statusLineHelp: string
  toastSetting: string
  toastSettingHelp: string
  turnOn: string
  turnOff: string
  on: string
  off: string
  nothingHere: (repo: string) => string
  nothingHereHint: string
  offlineHint: (url: string) => string
  unauthorizedHint: string
  status: (repo: string, pages: number, pending: boolean) => string
  statusOffline: string
  toast: (agent: string, when: string, summary: string | undefined, pending: boolean) => string
  footer: string
  kinds: Readonly<Record<string, string>>
  summary: (where: string, pages: number, handoff: string | null) => string
  closed: string
  textOnly: string
}

const units = (ms: number, now: string, m: string, h: string, d: string, wrap: (x: string) => string): string => {
  const minutes = Math.round(ms / 60_000)

  if (minutes < 1) {
    return now
  }

  if (minutes < 60) {
    return wrap(`${minutes} ${m}`)
  }

  const hours = Math.round(minutes / 60)

  return hours < 48 ? wrap(`${hours} ${h}`) : wrap(`${Math.round(hours / 24)} ${d}`)
}

const pt: Words = {
  title: 'Muninn',
  tagline: 'a memória do ai-memory',
  command: 'Muninn: a memória do ai-memory num painel. /muninn <termo> busca',
  argHint: '[termo]',
  online: 'online',
  offline: 'fora do ar',
  unauthorized: 'sem acesso',
  loading: 'buscando…',
  server: 'Servidor',
  project: 'Projeto',
  folder: 'Pasta',
  memory: 'Memória',
  counts: (p, s, o) => `${p} ${p === 1 ? 'página' : 'páginas'} · ${s} ${s === 1 ? 'sessão' : 'sessões'} · ${o} ${o === 1 ? 'observação' : 'observações'}`,
  week: 'Últimos 7 dias',
  weekLine: (s, o) => `${s} ${s === 1 ? 'sessão' : 'sessões'} · ${o} ${o === 1 ? 'observação' : 'observações'}`,
  last: 'Última atividade',
  never: 'nenhuma ainda',
  ago: ms => units(ms, 'agora', 'min', 'h', 'dias', x => `há ${x}`),
  handoff: 'Handoff',
  handoffState: (state, fresh) => (state === 'open' ? 'pendente' : state === 'accepted' ? (fresh ? 'entregue a esta sessão' : 'entregue') : state === 'expired' ? 'expirado' : state),
  handoffFrom: (agent, when, state) => `de ${agent} · ${when} · ${state}`,
  nextSteps: 'Próximos passos',
  openQuestions: 'Em aberto',
  noHandoff: 'Nenhum handoff neste projeto ainda.',
  search: 'Buscar na memória',
  searchHelp: 'Decisões, erros, nomes, o que você lembrar',
  placeholder: 'termo, decisão, erro…',
  go: 'Buscar',
  results: (n, q, all) => `${n} ${n === 1 ? 'resultado' : 'resultados'} para “${q}”${all ? ' em todos os projetos' : ''}`,
  noResults: q => `Nada encontrado para “${q}”.`,
  everywhere: 'Buscar em todos os projetos',
  here: 'Só neste projeto',
  recent: 'Recentes',
  noRecent: 'Nada consolidado ainda: as páginas aparecem quando uma sessão termina.',
  open: 'Abrir',
  back: 'Voltar',
  pickProject: 'Projeto deste painel',
  auto: repo => `Automático (${repo})`,
  projectHelp: 'Muninn acha o projeto pela pasta; escolha outro para fixar aqui',
  refresh: 'Atualizar',
  refreshed: 'Muninn voltou com notícias frescas.',
  web: 'Abrir Web UI',
  webHelp: 'O wiki completo no navegador; a senha é o token copiado abaixo',
  copyPassword: 'Copiar senha',
  copied: 'Senha da Web UI copiada.',
  notCopied: 'Não deu para copiar aqui.',
  restart: 'Reiniciar servidor',
  restarted: 'Servidor do ai-memory reiniciado.',
  notRestarted: 'Não consegui reiniciar o servidor por aqui.',
  more: 'Mais',
  settings: 'Ajustes',
  statusLine: 'Linha de status',
  statusLineHelp: 'Páginas do projeto e handoff pendente na barra de status',
  toastSetting: 'Aviso de handoff',
  toastSettingHelp: 'Um aviso quando a sessão começa com um handoff',
  turnOn: 'Ligar',
  turnOff: 'Desligar',
  on: 'Ligado',
  off: 'Desligado',
  nothingHere: repo => `Nada capturado ainda para “${repo}”.`,
  nothingHereHint: 'A primeira sessão nesta pasta cria o projeto; até lá, a busca vale para todos os projetos.',
  offlineHint: url => `O servidor do ai-memory não respondeu em ${url}.`,
  unauthorizedHint: 'O servidor recusou o token de ~/Library/Application Support/ai-memory/auth-tokens/default.',
  status: (repo, pages, pending) => `Muninn · ${repo} · ${pages} ${pages === 1 ? 'pág' : 'págs'}${pending ? ' · handoff' : ''}`,
  statusOffline: 'Muninn · fora do ar',
  toast: (agent, when, summary, pending) =>
    `Muninn ${pending ? 'trouxe um handoff pendente' : 'entregou o handoff'} de ${agent} (${when})${summary ? `: ${summary}` : ''}`,
  footer: 'Esc fecha · /muninn <termo> busca direto',
  kinds: { session: 'sessão', decision: 'decisão', gotcha: 'armadilha', concept: 'conceito', procedure: 'procedimento', rule: 'regra', note: 'nota', fact: 'fato', slot: 'slot' },
  summary: (where, pages, handoff) => `${where} · ${pages} ${pages === 1 ? 'pág' : 'págs'}${handoff ? ` · ${handoff}` : ''}`,
  closed: 'Muninn voltou para o ombro de Odin.',
  textOnly: 'Este app não desenha painéis de mods; aqui vai o resumo em texto.',
}

const en: Words = {
  title: 'Muninn',
  tagline: 'your ai-memory',
  command: 'Muninn: your ai-memory in a pane. /muninn <term> searches',
  argHint: '[term]',
  online: 'online',
  offline: 'offline',
  unauthorized: 'no access',
  loading: 'loading…',
  server: 'Server',
  project: 'Project',
  folder: 'Folder',
  memory: 'Memory',
  counts: (p, s, o) => `${p} ${p === 1 ? 'page' : 'pages'} · ${s} ${s === 1 ? 'session' : 'sessions'} · ${o} ${o === 1 ? 'observation' : 'observations'}`,
  week: 'Last 7 days',
  weekLine: (s, o) => `${s} ${s === 1 ? 'session' : 'sessions'} · ${o} ${o === 1 ? 'observation' : 'observations'}`,
  last: 'Last activity',
  never: 'none yet',
  ago: ms => units(ms, 'just now', 'min', 'h', 'days', x => `${x} ago`),
  handoff: 'Handoff',
  handoffState: (state, fresh) => (state === 'open' ? 'pending' : state === 'accepted' ? (fresh ? 'delivered to this session' : 'delivered') : state),
  handoffFrom: (agent, when, state) => `from ${agent} · ${when} · ${state}`,
  nextSteps: 'Next steps',
  openQuestions: 'Open questions',
  noHandoff: 'No handoff in this project yet.',
  search: 'Search memory',
  searchHelp: 'Decisions, errors, names, whatever you remember',
  placeholder: 'a term, a decision, an error…',
  go: 'Search',
  results: (n, q, all) => `${n} ${n === 1 ? 'result' : 'results'} for “${q}”${all ? ' in every project' : ''}`,
  noResults: q => `Nothing found for “${q}”.`,
  everywhere: 'Search every project',
  here: 'This project only',
  recent: 'Recent',
  noRecent: 'Nothing compiled yet: pages appear when a session ends.',
  open: 'Open',
  back: 'Back',
  pickProject: 'Project in this pane',
  auto: repo => `Automatic (${repo})`,
  projectHelp: 'Muninn finds the project from the folder; pick another to pin it here',
  refresh: 'Refresh',
  refreshed: 'Muninn is back with fresh news.',
  web: 'Open web UI',
  webHelp: 'The whole wiki in the browser; the password is the token copied below',
  copyPassword: 'Copy password',
  copied: 'Web UI password copied.',
  notCopied: 'Could not copy here.',
  restart: 'Restart server',
  restarted: 'ai-memory server restarted.',
  notRestarted: 'Could not restart the server from here.',
  more: 'More',
  settings: 'Settings',
  statusLine: 'Status line',
  statusLineHelp: "The project's pages and a pending handoff in the status line",
  toastSetting: 'Handoff notice',
  toastSettingHelp: 'A notice when a session starts with a handoff',
  turnOn: 'Turn on',
  turnOff: 'Turn off',
  on: 'On',
  off: 'Off',
  nothingHere: repo => `Nothing captured yet for “${repo}”.`,
  nothingHereHint: 'The first session in this folder creates the project; until then search covers every project.',
  offlineHint: url => `The ai-memory server did not answer at ${url}.`,
  unauthorizedHint: 'The server refused the token in ~/Library/Application Support/ai-memory/auth-tokens/default.',
  status: (repo, pages, pending) => `Muninn · ${repo} · ${pages} ${pages === 1 ? 'page' : 'pages'}${pending ? ' · handoff' : ''}`,
  statusOffline: 'Muninn · offline',
  toast: (agent, when, summary, pending) =>
    `Muninn ${pending ? 'brought a pending handoff' : 'delivered the handoff'} from ${agent} (${when})${summary ? `: ${summary}` : ''}`,
  footer: 'Esc closes · /muninn <term> searches straight away',
  kinds: { session: 'session', decision: 'decision', gotcha: 'gotcha', concept: 'concept', procedure: 'procedure', rule: 'rule', note: 'note', fact: 'fact', slot: 'slot' },
  summary: (where, pages, handoff) => `${where} · ${pages} ${pages === 1 ? 'page' : 'pages'}${handoff ? ` · ${handoff}` : ''}`,
  closed: "Muninn flew back to Odin's shoulder.",
  textOnly: 'This app draws no mod panes; here is the summary as text.',
}

export const WORDS: Readonly<Record<MuninnLang, Words>> = { pt, en }
