import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createEmbedding,
  transcribeWithGoogle,
  ttsStream,
} from '../apiService'
import { useSettingsStore } from '../../stores/settingsStore'
import { float32ArrayToWav } from '../../utils/audioProcess'

const mocks = vi.hoisted(() => ({
  isTTSReady: vi.fn(),
  isEmbeddingsReady: vi.fn(),
  generateEmbedding: vi.fn(),
  getOpenAIClient: vi.fn(),
}))

vi.mock('../backendApi', () => ({
  backendApi: {
    isTTSReady: mocks.isTTSReady,
    isEmbeddingsReady: mocks.isEmbeddingsReady,
    generateEmbedding: mocks.generateEmbedding,
  },
}))

vi.mock('../apiClients', async importOriginal => {
  const actual = await importOriginal<typeof import('../apiClients')>()
  return {
    ...actual,
    getOpenAIClient: mocks.getOpenAIClient,
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.getOpenAIClient.mockImplementation(() => {
    throw new Error('cloud fallback invoked')
  })
})

describe('transcribeWithGoogle', () => {
  it('rejects recordings longer than Google synchronous recognition allows', async () => {
    useSettingsStore().updateSetting('VITE_GOOGLE_API_KEY', 'test-key')
    const overlongRecording = float32ArrayToWav(
      new Float32Array(16000 * 60 + 1),
      16000
    )

    await expect(transcribeWithGoogle(overlongRecording)).rejects.toThrow(
      'Google STT only supports recordings up to 60 seconds'
    )
  })
})

describe('local provider cost boundaries', () => {
  it('does not call OpenAI when local TTS is unavailable', async () => {
    const settings = useSettingsStore()
    settings.updateSetting('ttsProvider', 'local')
    settings.updateSetting('VITE_OPENAI_API_KEY', 'stored-cloud-key')
    mocks.isTTSReady.mockResolvedValue(false)

    await expect(
      ttsStream('hello', new AbortController().signal)
    ).rejects.toThrow('Local TTS failed: Local TTS service is not ready')
    expect(mocks.getOpenAIClient).not.toHaveBeenCalled()
  })

  it('does not call OpenAI when explicitly local embeddings are unavailable', async () => {
    const settings = useSettingsStore()
    settings.updateSetting('embeddingProvider', 'local')
    settings.updateSetting('VITE_OPENAI_API_KEY', 'stored-cloud-key')
    mocks.isEmbeddingsReady.mockResolvedValue(false)

    await expect(createEmbedding('remember this')).resolves.toEqual([])
    expect(mocks.getOpenAIClient).not.toHaveBeenCalled()
  })
})
