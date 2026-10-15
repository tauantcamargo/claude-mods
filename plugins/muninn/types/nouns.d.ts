// The other mods' nouns Muninn calls, for the editor and tsc only: not Muninn's contract.
import type { KitSkin } from '../hooks/kit/tone'

declare module 'claude-code' {
  interface EngineInterface {
    // skins hands out the skin every mod of the pack wears.
    skins: { palette: () => Promise<KitSkin> }
  }
}
