export type WorkerStatus = 'running' | 'done' | 'failed'

export type Worker = {
  id: string
  agentId?: string
  god: string
  topic: string
  type: string
  status: WorkerStatus
  startedAt: number
  endedAt?: number
  stepDone?: number
  stepTotal?: number
  stepNote?: string
  tldr?: string
}

export type Check = { level: 'ok' | 'warn' | 'wait'; text: string }

export type Verification = { at: number; lines: Check[] }

// The /mods hub protocol (github.com/mvacoimbra/claude-mods-hub, PROTOCOL.md): one tab, drawn by the hub.
export type WorkersLang = 'en' | 'pt'
export type WorkersPanelArgs = { lang: WorkersLang; surface: 'terminal' | 'desktop' | 'vscode' | 'mobile'; columns: number }
export type WorkersTone = 'ok' | 'warn' | 'err' | 'muted' | 'accent'
export type WorkersItem =
  | { kind: 'toggle'; id: string; label: string; help?: string; value: boolean }
  | { kind: 'choice'; id: string; label: string; help?: string; value: string; options: { value: string; label: string }[] }
  | { kind: 'action'; id: string; label: string; help?: string; primary?: boolean }
  | { kind: 'input'; id: string; label: string; help?: string; placeholder?: string; submitLabel?: string }
  | { kind: 'info'; label: string; value: string; tone?: WorkersTone }
  | { kind: 'text'; text: string; tone?: WorkersTone }
  | { kind: 'swatch'; id: string; label: string; color: string; selected: boolean }
  | { kind: 'tree'; tree: unknown }
export type WorkersSection = { id: string; title: string; items: WorkersItem[] }
export type WorkersPanel = { title: string; summary?: string; tone?: WorkersTone; sections: WorkersSection[]; refreshMs?: number }
export type WorkersActArgs = { id: string; value?: string }
export type WorkersActResult = { message?: string }

declare module 'claude-code' {
  interface EngineInterface {
    workers: {
      panel: (args: WorkersPanelArgs) => Promise<WorkersPanel>
      act: (args: WorkersActArgs) => Promise<WorkersActResult>
    }
  }
  interface PluginState {
    workers: {
      workers: Worker[]
      verification: Verification | null
      autoOpened: boolean
      now: number
    }
  }
}
