import { describe, expect, it } from 'vitest'
import { hasUsableLocalMessage } from '../localMessageUtils'

describe('hasUsableLocalMessage', () => {
  it('keeps normal text messages', () => {
    expect(hasUsableLocalMessage({ content: 'hello' })).toBe(true)
  })

  it('drops empty text-only messages', () => {
    expect(hasUsableLocalMessage({ content: '   ' })).toBe(false)
    expect(hasUsableLocalMessage({ content: null })).toBe(false)
  })

  it('keeps assistant tool-call messages with null content', () => {
    expect(
      hasUsableLocalMessage({
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: { name: 'open_application', arguments: '{}' },
          },
        ],
      })
    ).toBe(true)
  })

  it('drops messages with no text and no tool calls', () => {
    expect(hasUsableLocalMessage({ content: '', tool_calls: [] })).toBe(false)
  })
})
