# Kiki 1.5.0 Release Candidate Notes

Kiki 1.5.0 is the first AliceMod release candidate focused on a local-first desktop assistant experience.

## Local-first defaults

New installations start with Ollama as the default language-model provider. Local Whisper is selected for speech recognition, Piper for speech synthesis, and local embeddings for memory and RAG. Cloud providers remain available but are opt-in rather than required for the baseline experience.

The default wake word is `kiki`.

## Local provider reliability

Ollama and LM Studio now preserve assistant messages that contain tool calls but no text. These turns are valid in OpenAI-compatible tool-call conversations and are required for multi-step local tool use.

Full prompt/context payload logging was removed from the local LLM provider path.

## Cost and privacy boundary

A selected local provider no longer silently falls back to OpenAI simply because an API key is stored.

- Piper failures stay local and surface an error.
- Explicitly local embedding failures do not invoke OpenAI embeddings.
- Google TTS failures do not silently switch to OpenAI TTS.

Regression tests cover the local TTS and embedding boundaries.

## Voice path

The local Whisper model setting is now connected to actual backend model selection. Supported IDs are Tiny English, Base, Small, Medium, and Large, with Large mapped to whisper.cpp Large v3.

Model identifiers are allowlisted by the Go backend. Missing selected models are downloaded on first use.

Wake handling now uses two stages. VAD segments an utterance, then a lightweight local Whisper probe checks for the wake word. The configured full Whisper model runs only after Kiki is addressed. This reduces unnecessary full-model transcription of ambient speech while keeping the architecture ready for a future dedicated acoustic wake-word engine.

## Desktop tools and permissions

Kiki exposes practical local assistant capabilities including clipboard access, approved directory inspection, opening applications and paths, memory, and shell execution.

Shell execution remains protected by a native Run once confirmation before the Electron main process invokes the command.

The audit identified an inherited scheduler flaw: scheduled command tasks can execute later without passing through the shell-command confirmation dialog. As a release safety measure, `schedule_task` and `manage_scheduled_tasks` are filtered out of every model provider until the scheduler is redesigned or gains an equivalent approval boundary.

## Packaging and updates

The packaged product is named Kiki and release artifacts use Kiki filenames for Windows, macOS, and Linux.

The Electron update feed now points to `Azimn/AliceMod`. It no longer points to upstream `pmbstyle/Alice`, preventing an upstream Alice release from replacing the fork through automatic update.

The existing `aliceaiapp` application ID is intentionally retained for compatibility and user-data continuity.

## Validation improvements

Both PR builds and tagged release builds now run the Go test suite with `go test ./...` in addition to the frontend Vitest suite. Tagged releases use `npm ci` for lockfile-reproducible dependency installation.

## Known release-candidate limitations

GitHub Actions must be enabled for the fork and the Windows, macOS, and Linux validation matrix must pass before this candidate should be published as a validated release.

The build system still downloads some inherited runtime binaries from upstream-hosted or third-party locations. Those dependencies should be treated as external release infrastructure and verified during the three-platform build.

Some internal names still contain Alice for compatibility, including `AliceSettings`, `alice-ai-app`, selected IPC/protocol identifiers, backend executable names, and the existing app ID. Those are not user-facing product identity changes.

## Upstream credit

Kiki is derived from the MIT-licensed Alice project by pmbstyle. The upstream repository remains available at `https://github.com/pmbstyle/Alice`.
