# AliceMod Local-First Architecture

AliceMod is being adapted so that a complete assistant experience can run without metered AI API usage. Cloud services remain optional capabilities, but they must never be required for the baseline assistant and they must never be invoked silently when the user has selected a local provider.

## Baseline execution path

The preferred first-run stack is Ollama for the language model, the bundled Whisper backend for speech recognition, Piper for speech synthesis, and local embeddings for memory and RAG. LM Studio remains an equivalent local LLM alternative. The onboarding wizard should discover the models actually available from the selected local endpoint and use one of those models rather than retaining a model name from another provider.

The assistant's local execution path must retain the same tool-call history semantics as the cloud path. Assistant messages that contain tool calls but no textual content are valid messages and must survive conversion, storage, and subsequent requests. Dropping those messages breaks multi-step tool use.

## No silent cloud fallback

Selecting a local provider is an explicit cost and privacy boundary. A failure in local STT, TTS, embeddings, summarization, or generation must not silently invoke a metered cloud service merely because credentials happen to exist in settings. The application should surface the local failure and offer the user an explicit choice to switch providers. Cloud fallback can be implemented only as a separately enabled policy that clearly identifies the destination service.

The TTS and embedding paths now enforce this boundary. When local Piper is selected, a local synthesis failure is surfaced instead of being rerouted to OpenAI. When local embeddings are explicitly selected, a local embedding failure returns no embedding rather than invoking OpenAI even if an OpenAI key happens to be stored. Google TTS likewise stays on the selected provider instead of silently failing over to OpenAI.

## Voice architecture

The existing microphone path uses VAD to segment speech and then performs full STT before checking the configured wake word. This provides functional wake-word gating, but it is not a dedicated low-cost wake-word detector. For an ambient Windows assistant, the long-term architecture should separate inexpensive wake detection from full utterance transcription so that idle listening does not repeatedly invoke Whisper.

Local speech settings must also correspond to real backend behavior. The frontend currently stores a `localSttModel` choice, while the transcription API passes audio, sample rate, and language to the Go backend and the Whisper service resolves its own model path. Until model selection is wired end to end, the UI must not imply that changing this value changes the active Whisper model.

## Assistant tooling and permissions

Alice already contains the essential desktop-assistant tools, including opening applications and files, clipboard access, directory inspection, shell command execution, reminders, scheduling, memory, and web-related capabilities. Tool availability and execution permission are separate concerns and should remain separate. AliceMod can expose a useful local tool set by default while retaining approval gates for potentially consequential operations.

Local model compatibility is part of this contract. Tool schemas must remain valid for Ollama and LM Studio, tool-call-only assistant turns must survive round trips, and failure handling must not force a cloud provider.

## Completion criteria

The local-first foundation is complete when a new Windows installation can finish onboarding, discover a local LLM, converse by voice, use memory, execute approved desktop tools, schedule reminders, and recover from local-service failures without requiring or silently contacting a metered AI API. Cloud providers should then function as optional upgrades rather than hidden dependencies.
