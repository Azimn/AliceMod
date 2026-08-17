import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useConversationStore } from './conversationStore'
import { useGeneralStore } from './generalStore'
import { reinitializeClients } from '../services/apiClients'
import { DEFAULT_PERSONA_PROMPT } from '../prompts/defaultPersonaPrompt'
import {
  DEEPSEEK_OPENAI_BASE_URL,
  MINIMAX_OPENAI_BASE_URL,
  PROVIDER_CONFIGS,
  ZAI_CODING_BASE_URL,
  getProviderDisplayName,
  getSafeProviderModel,
  type AIProviderKey,
} from '../services/llmProviders/providerCatalog'

export const DEFAULT_ASSISTANT_PERSONA_PROMPT = DEFAULT_PERSONA_PROMPT

const DEFAULT_SUMMARIZATION_SYSTEM_PROMPT = `You are an expert conversation summarizer.
Your task is to create a **concise and brief** factual summary of the following conversation segment.
Focus on:
- Key topics discussed.
- Important information, facts, or preferences shared by the user or assistant.
- Decisions made.
- Any unresolved questions or outstanding tasks.

The summary should help provide context for future interactions, allowing the conversation to resume naturally.
**Keep the summary to 2-4 sentences and definitely no more than 150 words.**
Do not add any conversational fluff, commentary, or an introductory/concluding sentence like "Here is the summary:". Just provide the factual summary of the conversation transcript.`

export interface AliceSettings {
  VITE_OPENAI_API_KEY: string
  VITE_OPENROUTER_API_KEY: string
  VITE_ZAI_API_KEY: string
  VITE_MINIMAX_API_KEY: string
  VITE_DEEPSEEK_API_KEY: string
  VITE_GROQ_API_KEY: string
  VITE_GOOGLE_API_KEY: string
  sttProvider: 'openai' | 'groq' | 'google' | 'local'
  aiProvider: AIProviderKey
  localSttModel: string
  localSttLanguage: string
  localSttEnabled: boolean
  localSttWakeWord: string
  ollamaBaseUrl: string
  lmStudioBaseUrl: string
  zaiBaseUrl: string
  minimaxBaseUrl: string
  deepseekBaseUrl: string
  codexAuthConnected: boolean
  codexAccountLabel: string
  assistantModel: string
  assistantSystemPrompt: string
  assistantTemperature: number
  assistantTopP: number
  assistantReasoningEffort: 'minimal' | 'low' | 'medium' | 'high'
  assistantVerbosity: 'low' | 'medium' | 'high'
  assistantTools: string[]
  assistantAvatar: string
  mcpServersConfig?: string
  MAX_HISTORY_MESSAGES_FOR_API: number
  SUMMARIZATION_MESSAGE_COUNT: number
  SUMMARIZATION_MODEL: string
  SUMMARIZATION_SYSTEM_PROMPT: string
  ttsProvider: 'openai' | 'google' | 'local'
  ttsVoice:
    | 'alloy'
    | 'ash'
    | 'ballad'
    | 'coral'
    | 'echo'
    | 'fable'
    | 'nova'
    | 'onyx'
    | 'sage'
    | 'shimmer'
    | 'verse'
    | 'marin'
    | 'cedar'
  googleTtsVoice: string
  localTtsVoice: string
  embeddingProvider: 'openai' | 'local'
  ragEnabled: boolean
  ragPaths: string[]
  ragTopK: number
  ragMaxContextChars: number
  microphoneToggleHotkey: string
  mutePlaybackHotkey: string
  takeScreenshotHotkey: string
  VITE_JACKETT_API_KEY: string
  VITE_JACKETT_URL: string
  VITE_QB_URL: string
  VITE_QB_USERNAME: string
  VITE_QB_PASSWORD: string
  VITE_TAVILY_API_KEY: string
  VITE_SEARXNG_URL: string
  VITE_SEARXNG_API_KEY: string
  websocketPort: number
  approvedCommands: string[]
  onboardingCompleted: boolean
}

function hasMinimumConfigForOnboarding(config: AliceSettings): boolean {
  if (config.VITE_OPENAI_API_KEY?.trim()) return true
  if (config.VITE_OPENROUTER_API_KEY?.trim()) return true
  if (config.VITE_ZAI_API_KEY?.trim()) return true
  if (config.VITE_MINIMAX_API_KEY?.trim()) return true
  if (config.VITE_DEEPSEEK_API_KEY?.trim()) return true
  if (config.codexAuthConnected) return true
  if (config.aiProvider === 'ollama') return Boolean(config.ollamaBaseUrl?.trim())
  if (config.aiProvider === 'lm-studio') return Boolean(config.lmStudioBaseUrl?.trim())
  return false
}

const defaultSettings: AliceSettings = {
  VITE_OPENAI_API_KEY: '',
  VITE_OPENROUTER_API_KEY: '',
  VITE_ZAI_API_KEY: '',
  VITE_MINIMAX_API_KEY: '',
  VITE_DEEPSEEK_API_KEY: '',
  VITE_GROQ_API_KEY: '',
  VITE_GOOGLE_API_KEY: '',
  sttProvider: 'local',
  aiProvider: 'ollama',
  localSttModel: 'whisper-base',
  localSttLanguage: 'auto',
  localSttEnabled: true,
  localSttWakeWord: 'kiki',
  ollamaBaseUrl: 'http://localhost:11434',
  lmStudioBaseUrl: 'http://localhost:1234',
  zaiBaseUrl: ZAI_CODING_BASE_URL,
  minimaxBaseUrl: MINIMAX_OPENAI_BASE_URL,
  deepseekBaseUrl: DEEPSEEK_OPENAI_BASE_URL,
  codexAuthConnected: false,
  codexAccountLabel: '',
  assistantModel: PROVIDER_CONFIGS.ollama.defaultModel,
  assistantSystemPrompt: DEFAULT_PERSONA_PROMPT,
  assistantTemperature: 0.7,
  assistantTopP: 1.0,
  assistantReasoningEffort: 'medium',
  assistantVerbosity: 'medium',
  assistantTools: [
    'get_current_datetime',
    'open_path',
    'manage_clipboard',
    'list_directory',
    'execute_command',
    'schedule_task',
    'manage_scheduled_tasks',
    'save_memory',
    'delete_memory',
    'recall_memories',
  ],
  assistantAvatar: 'alice',
  mcpServersConfig: '[]',
  MAX_HISTORY_MESSAGES_FOR_API: 10,
  SUMMARIZATION_MESSAGE_COUNT: 20,
  SUMMARIZATION_MODEL: PROVIDER_CONFIGS.ollama.defaultModel,
  SUMMARIZATION_SYSTEM_PROMPT: DEFAULT_SUMMARIZATION_SYSTEM_PROMPT,
  ttsProvider: 'local',
  ttsVoice: 'nova',
  googleTtsVoice: 'en-US-Journey-F',
  localTtsVoice: 'en_US-amy-medium',
  embeddingProvider: 'local',
  ragEnabled: false,
  ragPaths: [],
  ragTopK: 5,
  ragMaxContextChars: 1500,
  microphoneToggleHotkey: 'Alt+M',
  mutePlaybackHotkey: 'Alt+S',
  takeScreenshotHotkey: 'Alt+C',
  VITE_JACKETT_API_KEY: '',
  VITE_JACKETT_URL: '',
  VITE_QB_URL: '',
  VITE_QB_USERNAME: '',
  VITE_QB_PASSWORD: '',
  VITE_TAVILY_API_KEY: '',
  VITE_SEARXNG_URL: '',
  VITE_SEARXNG_API_KEY: '',
  websocketPort: 5421,
  approvedCommands: ['ls', 'dir'],
  onboardingCompleted: false,
}

const settingKeyToLabelMap: Record<keyof AliceSettings, string> = {
  VITE_OPENAI_API_KEY: 'OpenAI API Key',
  VITE_OPENROUTER_API_KEY: 'OpenRouter API Key',
  VITE_ZAI_API_KEY: 'Z.ai API Key',
  VITE_MINIMAX_API_KEY: 'MiniMax API Key',
  VITE_DEEPSEEK_API_KEY: 'DeepSeek API Key',
  VITE_GROQ_API_KEY: 'Groq API Key (STT)',
  VITE_GOOGLE_API_KEY: 'Google API Key',
  sttProvider: 'Speech-to-Text Provider',
  aiProvider: 'AI Provider',
  localSttModel: 'Local STT Model',
  localSttLanguage: 'Language',
  localSttEnabled: 'Enable Wake Word',
  localSttWakeWord: 'Wake Word',
  ollamaBaseUrl: 'Ollama Base URL',
  lmStudioBaseUrl: 'LM Studio Base URL',
  zaiBaseUrl: 'Z.ai Base URL',
  minimaxBaseUrl: 'MiniMax Base URL',
  deepseekBaseUrl: 'DeepSeek Base URL',
  codexAuthConnected: 'ChatGPT Codex authorization',
  codexAccountLabel: 'ChatGPT Codex account',
  assistantModel: 'Assistant Model',
  assistantSystemPrompt: 'Assistant Persona Prompt',
  assistantTemperature: 'Assistant Temperature',
  assistantTopP: 'Assistant Top P',
  assistantReasoningEffort: 'Reasoning Effort',
  assistantVerbosity: 'Response Verbosity',
  assistantTools: 'Enabled Assistant Tools',
  assistantAvatar: 'Assistant Avatar',
  MAX_HISTORY_MESSAGES_FOR_API: 'Max History Messages for API',
  SUMMARIZATION_MESSAGE_COUNT: 'Summarization Message Count',
  SUMMARIZATION_MODEL: 'Summarization Model',
  SUMMARIZATION_SYSTEM_PROMPT: 'Summarization System Prompt',
  ttsProvider: 'Text-to-Speech Provider',
  ttsVoice: 'OpenAI TTS Voice',
  googleTtsVoice: 'Google TTS Voice',
  localTtsVoice: 'Local TTS Voice',
  embeddingProvider: 'Embedding Provider',
  ragEnabled: 'Local Documents (RAG) Enabled',
  ragPaths: 'Local Documents Paths',
  ragTopK: 'Local Documents Top K',
  ragMaxContextChars: 'Local Documents Max Context Chars',
  microphoneToggleHotkey: 'Microphone Toggle Hotkey',
  mutePlaybackHotkey: 'Mute Playback Hotkey',
  takeScreenshotHotkey: 'Take Screenshot Hotkey',
  VITE_JACKETT_API_KEY: 'Jackett API Key (Torrents)',
  VITE_JACKETT_URL: 'Jackett URL (Torrents)',
  VITE_QB_URL: 'qBittorrent URL',
  VITE_QB_USERNAME: 'qBittorrent Username',
  VITE_QB_PASSWORD: 'qBittorrent Password',
  VITE_TAVILY_API_KEY: 'Tavily API Key (Web Search)',
  VITE_SEARXNG_URL: 'SearXNG Instance URL',
  VITE_SEARXNG_API_KEY: 'SearXNG API Key (optional)',
  websocketPort: 'WebSocket Port',
  mcpServersConfig: 'MCP Servers JSON Configuration',
  approvedCommands: 'Approved Commands',
  onboardingCompleted: 'Onboarding Completed',
}

function requiresOpenAIKey(config: AliceSettings): boolean {
  return (
    config.aiProvider === 'openai' ||
    config.sttProvider === 'openai' ||
    config.ttsProvider === 'openai' ||
    config.embeddingProvider === 'openai'
  )
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AliceSettings>({ ...defaultSettings })
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const initialLoadAttempted = ref(false)
  const coreOpenAISettingsValid = ref(false)
  const sessionApprovedCommands = ref<string[]>([])

  const validateAndFixSettings = (
    loadedSettings: Partial<AliceSettings>
  ): { settings: AliceSettings; migrated: boolean } => {
    const validated = { ...defaultSettings, ...loadedSettings }
    let migrated = false
    if ((validated.sttProvider as any) === 'transformers') {
      validated.sttProvider = 'local'
      migrated = true
      if ((loadedSettings as any).transformersModel) validated.localSttModel = (loadedSettings as any).transformersModel
      if ((loadedSettings as any).transformersLanguage) validated.localSttLanguage = (loadedSettings as any).transformersLanguage
      if ((loadedSettings as any).transformersWakeWordEnabled !== undefined) validated.localSttEnabled = (loadedSettings as any).transformersWakeWordEnabled
      if ((loadedSettings as any).transformersWakeWord) validated.localSttWakeWord = (loadedSettings as any).transformersWakeWord
    }
    const validSTTProviders = ['openai', 'groq', 'google', 'local'] as const
    if (!validSTTProviders.includes(validated.sttProvider as any)) {
      validated.sttProvider = 'local'
      migrated = true
    }
    const validAIProviders = ['openai', 'openrouter', 'ollama', 'lm-studio', 'zai', 'minimax', 'deepseek', 'codex'] as const
    if (!validAIProviders.includes(validated.aiProvider as any)) {
      validated.aiProvider = 'ollama'
      migrated = true
    }
    const safeAssistantModel = getSafeProviderModel(validated.aiProvider, validated.assistantModel)
    if (safeAssistantModel !== validated.assistantModel) {
      validated.assistantModel = safeAssistantModel
      migrated = true
    }
    const safeSummarizationModel = getSafeProviderModel(validated.aiProvider, validated.SUMMARIZATION_MODEL)
    if (safeSummarizationModel !== validated.SUMMARIZATION_MODEL) {
      validated.SUMMARIZATION_MODEL = safeSummarizationModel
      migrated = true
    }
    if (!validated.VITE_OPENAI_API_KEY?.trim() && validated.aiProvider !== 'openai' && validated.embeddingProvider === 'openai') {
      validated.embeddingProvider = 'local'
      migrated = true
    }
    if (!loadedSettings.localSttWakeWord || validated.localSttWakeWord === 'alice') {
      validated.localSttWakeWord = 'kiki'
      migrated = true
    }
    if (!Array.isArray(validated.ragPaths)) {
      validated.ragPaths = []
      migrated = true
    }
    if (!Number.isFinite(validated.ragTopK) || validated.ragTopK < 1) {
      validated.ragTopK = defaultSettings.ragTopK
      migrated = true
    }
    if (!Number.isFinite(validated.ragMaxContextChars) || validated.ragMaxContextChars < 300) {
      validated.ragMaxContextChars = defaultSettings.ragMaxContextChars
      migrated = true
    }
    if (validated.sttProvider === 'local') {
      const validModelIds = ['whisper-tiny.en', 'whisper-base', 'whisper-small', 'whisper-medium', 'whisper-large']
      if (!validModelIds.includes(validated.localSttModel)) {
        validated.localSttModel = 'whisper-base'
        migrated = true
      }
    }
    return { settings: validated, migrated }
  }

  const isProduction = computed(() => import.meta.env.PROD)

  const areEssentialSettingsProvided = computed(() => {
    if (!isProduction.value) return true
    const essentialKeys: (keyof AliceSettings)[] = ['assistantModel', 'SUMMARIZATION_MODEL']
    if (settings.value.aiProvider === 'openai') essentialKeys.push('VITE_OPENAI_API_KEY')
    else if (settings.value.aiProvider === 'openrouter') essentialKeys.push('VITE_OPENROUTER_API_KEY')
    else if (settings.value.aiProvider === 'zai') essentialKeys.push('VITE_ZAI_API_KEY', 'zaiBaseUrl')
    else if (settings.value.aiProvider === 'minimax') essentialKeys.push('VITE_MINIMAX_API_KEY', 'minimaxBaseUrl')
    else if (settings.value.aiProvider === 'deepseek') essentialKeys.push('VITE_DEEPSEEK_API_KEY', 'deepseekBaseUrl')
    else if (settings.value.aiProvider === 'codex') essentialKeys.push('codexAuthConnected')
    else if (settings.value.aiProvider === 'ollama') essentialKeys.push('ollamaBaseUrl')
    else if (settings.value.aiProvider === 'lm-studio') essentialKeys.push('lmStudioBaseUrl')
    if (requiresOpenAIKey(settings.value)) essentialKeys.push('VITE_OPENAI_API_KEY')
    if (settings.value.sttProvider === 'groq') essentialKeys.push('VITE_GROQ_API_KEY')
    if (settings.value.sttProvider === 'google' || settings.value.ttsProvider === 'google') essentialKeys.push('VITE_GOOGLE_API_KEY')
    if (settings.value.sttProvider === 'local') essentialKeys.push('localSttModel')
    return essentialKeys.every(key => {
      const value = settings.value[key]
      if (typeof value === 'string') return !!value.trim()
      if (typeof value === 'number') return true
      if (typeof value === 'boolean') return value
      if (Array.isArray(value)) return true
      return false
    })
  })

  const areCoreApiKeysSufficientForTesting = computed(() => {
    if (!isProduction.value) return true
    if (requiresOpenAIKey(settings.value) && !settings.value.VITE_OPENAI_API_KEY?.trim()) return false
    if (settings.value.aiProvider === 'openrouter') return !!settings.value.VITE_OPENROUTER_API_KEY?.trim()
    if (settings.value.aiProvider === 'zai') return !!settings.value.VITE_ZAI_API_KEY?.trim() && !!settings.value.zaiBaseUrl?.trim()
    if (settings.value.aiProvider === 'minimax') return !!settings.value.VITE_MINIMAX_API_KEY?.trim() && !!settings.value.minimaxBaseUrl?.trim()
    if (settings.value.aiProvider === 'deepseek') return !!settings.value.VITE_DEEPSEEK_API_KEY?.trim() && !!settings.value.deepseekBaseUrl?.trim()
    if (settings.value.aiProvider === 'ollama') return !!settings.value.ollamaBaseUrl?.trim()
    if (settings.value.aiProvider === 'lm-studio') return !!settings.value.lmStudioBaseUrl?.trim()
    if (settings.value.aiProvider === 'codex') return settings.value.codexAuthConnected
    return true
  })

  const config = computed<Readonly<AliceSettings>>(() => settings.value)

  async function saveSettingsToFile(): Promise<boolean> {
    if (!isProduction.value && !window.settingsAPI?.saveSettings) {
      successMessage.value = 'Settings updated (Dev Mode - Not saved to file unless IPC available)'
      return true
    }
    isSaving.value = true
    error.value = null
    try {
      const saveResult = await window.settingsAPI.saveSettings({ ...settings.value, assistantTools: Array.from(settings.value.assistantTools || []), ragPaths: Array.from(settings.value.ragPaths || []), approvedCommands: Array.from(settings.value.approvedCommands || []) })
      isSaving.value = false
      if (saveResult.success) return true
      error.value = `Failed to save settings to file: ${saveResult.error || 'Unknown error'}`
      return false
    } catch (e: any) {
      error.value = `Error during settings save: ${e.message}`
      isSaving.value = false
      return false
    }
  }

  async function loadSettings() {
    if (initialLoadAttempted.value) return
    initialLoadAttempted.value = true
    isLoading.value = true
    try {
      const loaded = window.settingsAPI ? await window.settingsAPI.loadSettings() : null
      const result = validateAndFixSettings((loaded || {}) as Partial<AliceSettings>)
      settings.value = result.settings
      if (result.migrated && window.settingsAPI) await saveSettingsToFile()
    } catch (e: any) {
      error.value = `Failed to load settings: ${e.message}`
      settings.value = { ...defaultSettings }
    } finally {
      isLoading.value = false
    }
  }

  function updateSetting(key: keyof AliceSettings, value: string | boolean | number | string[]) {
    if (['assistantTemperature', 'assistantTopP', 'MAX_HISTORY_MESSAGES_FOR_API', 'SUMMARIZATION_MESSAGE_COUNT', 'websocketPort', 'ragTopK', 'ragMaxContextChars'].includes(key)) (settings.value as any)[key] = Number(value)
    else if ((key === 'assistantTools' || key === 'ragPaths') && Array.isArray(value)) settings.value[key] = value as string[]
    else (settings.value as any)[key] = value
    if (key === 'aiProvider') {
      settings.value.aiProvider = value as AIProviderKey
      const providerDefaults = PROVIDER_CONFIGS[settings.value.aiProvider]
      if (providerDefaults) {
        settings.value.assistantModel = providerDefaults.defaultModel
        settings.value.SUMMARIZATION_MODEL = providerDefaults.defaultModel
      }
    }
    successMessage.value = null
    error.value = null
  }

  async function saveAndTestSettings() {
    const generalStore = useGeneralStore()
    const conversationStore = useConversationStore()
    const saved = await saveSettingsToFile()
    if (!saved) return
    reinitializeClients()
    try {
      await conversationStore.fetchModels()
      coreOpenAISettingsValid.value = true
      generalStore.statusMessage = 'Re-initializing Kiki with new settings...'
      if (conversationStore.isInitialized) conversationStore.isInitialized = false
      const initSuccess = await conversationStore.initialize()
      if (initSuccess) {
        successMessage.value = 'Settings are valid and saved! Kiki is ready.'
        generalStore.setAudioState('IDLE')
      } else {
        error.value = 'Failed to re-initialize Kiki with new settings.'
      }
    } catch (e: any) {
      error.value = `${getProviderDisplayName(settings.value.aiProvider)} connection test failed: ${e.message}`
      coreOpenAISettingsValid.value = false
    }
  }

  async function completeOnboarding(onboardingData: any) {
    settings.value = { ...settings.value, ...onboardingData }
    if (onboardingData.summarizationModel) settings.value.SUMMARIZATION_MODEL = onboardingData.summarizationModel
    if (onboardingData.useLocalModels) {
      settings.value.sttProvider = 'local'
      settings.value.ttsProvider = 'local'
      settings.value.embeddingProvider = 'local'
      settings.value.localSttEnabled = true
      settings.value.localSttWakeWord = 'kiki'
    }
    settings.value.onboardingCompleted = true
    const success = await saveSettingsToFile()
    if (success) {
      reinitializeClients()
      await useConversationStore().initialize()
    }
    return success
  }

  function addApprovedCommand(command: string) {
    const commandName = command.split(' ')[0]
    if (!settings.value.approvedCommands.includes(commandName)) {
      settings.value.approvedCommands.push(commandName)
      void saveSettingsToFile()
    }
  }
  function addSessionApprovedCommand(command: string) {
    const commandName = command.split(' ')[0]
    if (!sessionApprovedCommands.value.includes(commandName)) sessionApprovedCommands.value.push(commandName)
  }
  function isCommandApproved(command: string): boolean {
    const commandName = command.split(' ')[0]
    return settings.value.approvedCommands.includes(commandName) || sessionApprovedCommands.value.includes(commandName)
  }
  async function removeApprovedCommand(command: string) {
    const commandName = command.split(' ')[0]
    const index = settings.value.approvedCommands.indexOf(commandName)
    if (index > -1) {
      settings.value.approvedCommands.splice(index, 1)
      await saveSettingsToFile()
    }
  }

  return {
    settings,
    isLoading,
    isSaving,
    error,
    successMessage,
    initialLoadAttempted,
    coreOpenAISettingsValid,
    sessionApprovedCommands,
    isProduction,
    areEssentialSettingsProvided,
    areCoreApiKeysSufficientForTesting,
    config,
    loadSettings,
    updateSetting,
    saveSettingsToFile,
    saveAndTestSettings,
    completeOnboarding,
    addApprovedCommand,
    addSessionApprovedCommand,
    isCommandApproved,
    removeApprovedCommand,
  }
})
