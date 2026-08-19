# AliceMod Local-First Architecture

AliceMod is being adapted so that a complete assistant experience can run without metered AI API usage. The user-facing assistant is Kiki. Compatibility-facing internal identifiers such as the `AliceSettings` TypeScript type, the `alice-ai-app` package name, IPC names, custom protocol names, and links to the real upstream `pmbstyle/Alice` repository may retain Alice naming when changing them provides no user benefit or would create migration risk.

Cloud services remain optional capabilities, but they must never be required for the baseline assistant and they must never be invoked silently when the user has selected a local provider.

## Baseline execution path

The preferred first-run stack is Ollama for the language model, the bundled Whisper backend for speech recognition, Piper for speech synthesis, and local embeddings for memory and RAG. LM Studio remains an equivalent local LLM alternative. The onboarding wizard should discover the models actually available from the selected local endpoint and use one of those models rather than retaining a model name from another provider.

The assistant's local execution path must retain the same tool-call history semantics as the cloud path. Assistant messages that contain tool calls but no textual content are valid messages and must survive conversion, storage, and subsequent requests. Dropping those messages breaks multi-step tool use.

## No silent cloud fallback

Selecting a local provider is an explicit cost and privacy boundary. A failure in local STT, TTS, embeddings, summarization, or generation must not silently invoke a metered cloud service merely because credentials happen to exist in settings. The application should surface the local failure and offer the user an explicit choice to switch providers. Cloud fallback can be implemented only as a separately enabled policy that clearly identifies the destination service.

The TTS and embedding paths now enforce this boundary. When local Piper is selected, a local synthesis failure is surfaced instead of being rerouted to OpenAI. When local embeddings are explicitly selected, a local embedding failure returns no embedding rather than invoking OpenAI even if an OpenAI key happens to be stored. Google TTS likewise stays on the selected provider instead of silently failing over to OpenAI.

## Voice architecture

The microphone path uses VAD to segment speech. When local wake-word mode is enabled, Kiki now runs a lightweight first-stage Whisper probe before invoking the configured full transcription model. Auto and English configurations use `whisper-tiny.en` for the probe; other configured languages use `whisper-base`. If the wake word is absent, the utterance is discarded and Kiki continues listening. If it is present, the selected local Whisper model performs the full transcription.

The local STT model selector is wired end to end. The frontend sends the selected model identifier through the backend API, and the Go Whisper service resolves only an allowlisted set of model IDs: `whisper-tiny.en`, `whisper-base`, `whisper-small`, `whisper-medium`, and `whisper-large`. Missing selected models are downloaded on first use. The client and loopback server permit long-running first-use model operations so larger model downloads are not cut off by the normal request timeout.

This two-stage design substantially reduces unnecessary full-model work, but it is still speech recognition rather than a dedicated acoustic wake-word engine. A future optimization can replace the first-stage Whisper probe with a specialized low-cost detector without changing the full-transcription contract.

## Assistant tooling and permissions

Kiki contains the essential desktop-assistant tools, including opening applications and files, clipboard access, directory inspection, shell command execution, reminders, scheduling, and memory. The local-first defaults expose these useful capabilities to the model while keeping command execution behind the existing approval system. Tool availability and execution permission remain separate concerns.

Local model compatibility is part of this contract. Tool schemas must remain valid for Ollama and LM Studio, tool-call-only assistant turns must survive round trips, and failure handling must not force a cloud provider.

## Completion criteria

The local-first foundation is complete when a new Windows installation can finish onboarding, discover a local LLM, converse by voice, use memory, execute approved desktop tools, schedule reminders, and recover from local-service failures without requiring or silently contacting a metered AI API. Cloud providers should then function as optional upgrades rather than hidden dependencies.
