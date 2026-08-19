import rawFunctionSchemasFromFile from '../../docs/functions.json'

export interface ApiRequestBodyFunctionTool {
  type: 'function'
  name: string
  strict: boolean
  description?: string
  parameters: Record<string, any>
}

const MODEL_BLOCKED_TOOLS = new Set(['schedule_task', 'manage_scheduled_tasks'])

export const PREDEFINED_OPENAI_TOOLS: ApiRequestBodyFunctionTool[] = (
  rawFunctionSchemasFromFile as any[]
)
  .filter(schema => !MODEL_BLOCKED_TOOLS.has(schema.name))
  .map(schema => {
    if (
      schema.parameters &&
      schema.parameters.type === 'object' &&
      schema.parameters.additionalProperties === undefined
    ) {
      schema.parameters.additionalProperties = false
    }
    return {
      type: 'function',
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      strict: schema.strict ?? false,
    }
  })
