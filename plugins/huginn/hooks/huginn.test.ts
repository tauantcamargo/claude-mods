import { expect, test } from 'claude-code/testing'

// The hooks here stand for the engine beneath huginn: a status call is recorded, a skill expands
// to its own text and a prompt goes on as typed.
test('a huginn skill pins its tier in the status line until the next prompt', async ($, on) => {
  const lines: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    lines.push(e.text)

    return { value: undefined }
  })
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  await $.skill.prompt({ skill: 'huginn:deep', text: 'think', frontmatter: { effort: 'xhigh' }, source: 'plugin', pluginName: 'huginn' })
  expect(lines.at(-1)).toBe('ᚺ deep·xhigh')

  // Another plugin's skill leaves the chip alone.
  await $.skill.prompt({ skill: 'commit', text: 'commit', frontmatter: { effort: 'low' }, source: 'userSettings' })
  expect(lines).toEqual(['ᚺ deep·xhigh'])

  await $.prompt.submit({ text: 'next step' } as never)
  expect(lines).toEqual(['ᚺ deep·xhigh', undefined])
})
