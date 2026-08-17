export interface LocalChatMessageLike {
  content?: unknown
  tool_calls?: unknown
}

/**
 * Keep local chat messages that contain either user-visible text or tool calls.
 *
 * OpenAI-compatible local servers permit assistant messages with null content
 * when the assistant is requesting one or more tools. Dropping those messages
 * breaks the tool-call -> tool-result conversation chain.
 */
export function hasUsableLocalMessage(message: LocalChatMessageLike): boolean {
  const hasText =
    typeof message.content === 'string' && message.content.trim().length > 0
  const hasToolCalls =
    Array.isArray(message.tool_calls) && message.tool_calls.length > 0

  return hasText || hasToolCalls
}
