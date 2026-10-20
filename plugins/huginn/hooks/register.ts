import type { Register } from 'claude-code'

// Huginn, Odin's raven of thought: a chip in the status line naming the tier a huginn skill set
// (`ᚺ deep·xhigh`). The skill's effort lasts for the rest of the turn, so the chip goes on the
// next prompt. Skills, subagents and the session-start policy need no code; this is all of it.

const PLUGIN = 'huginn'
const RUNE = 'ᚺ'

export const register: Register = on => {
  on('skill.prompt', async ($, e, next) => {
    const done = await next(e)
    const ours = e.pluginName === PLUGIN || e.skill.startsWith(`${PLUGIN}:`)

    if (ours) {
      const tier = e.skill.slice(e.skill.lastIndexOf(':') + 1)
      const effort = typeof e.frontmatter.effort === 'string' ? e.frontmatter.effort : undefined
      $.ui.status(effort ? `${RUNE} ${tier}·${effort}` : `${RUNE} ${tier}`)
    }

    return done
  })

  // A typed `/huginn:deep` passes here before the skill expands, so its own chip survives.
  // Never in a prompt's way: should clearing fail, the prompt goes on as sent.
  on('prompt.submit', async ($, e, next) => {
    $.ui.status(undefined)

    return next(e)
  }).catch(($, e, next) => next(e))
}
