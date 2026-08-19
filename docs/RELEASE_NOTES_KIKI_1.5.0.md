# Kiki 1.5.0 Release Candidate Notes

Kiki 1.5.0 is the first AliceMod release candidate focused on a local-first desktop assistant experience and on implementing Kiki as an established character rather than a generic renamed assistant.

## Character implementation

The default persona now encodes Kiki's stable identity rather than a generic warm-and-witty assistant description. Her late-1980s/1990s valley-girl social voice, expressive personality, casual technical brilliance, period-limited personal voice, continuity, and practical assistant competence are treated as character invariants.

`docs/KIKI_CHARACTER.md` records these invariants independently of any particular language model. The implementation rule is to degrade capability before identity when the runtime changes.

A fresh Kiki profile loads this canonical prompt by default. Existing customized persona prompts are intentionally not overwritten automatically.

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

The Piper backend now distinguishes initialization from real runtime readiness. A missing Piper executable, missing required Windows DLL, non-executable Unix binary, missing voice model, or Piper synthesis failure is reported as an error. Kiki's TTS API no longer accepts the inherited generated placeholder WAV as successful local speech.

Regression tests cover the local TTS and embedding boundaries, plus strict Piper runtime readiness.

## Voice path

The local Whisper model setting is connected to actual backend model selection. Supported IDs are Tiny English, Base, Small, Medium, and Large, with Large mapped to whisper.cpp Large v3.

Model identifiers are allowlisted by the Go backend. Missing selected models are downloaded on first use.

Wake handling uses two stages. VAD segments an utterance, then a lightweight local Whisper probe checks for the wake word using raw PCM samples. The configured full Whisper model runs only after Kiki is addressed. This reduces unnecessary full-model transcription of ambient speech while keeping the architecture ready for a future dedicated acoustic wake-word engine.

## Windows runtime integrity

The normal Windows x64 backend build now prepares critical speech runtime files before the inherited build helper runs.

- Whisper is pinned to the official whisper.cpp v1.9.2 x64 release archive and verified with its published SHA-256 digest.
- FFmpeg is pinned to a specific BtbN Windows x64 build and verified with its published SHA-256 digest.
- The default `ggml-base.bin` Whisper model is pinned to a specific Hugging Face repository revision and verified against the upstream project's published Base-model SHA-1 value.
- A digest mismatch stops the preparation step rather than extracting or packaging unverified bytes.

The local embedding setup was already pinned: ONNX Runtime archives, the multilingual E5 ONNX model, and tokenizer are verified against fixed SHA-256 values and the E5 artifacts use a fixed Hugging Face revision.

Piper remains sourced from the pinned rhasspy Piper release used by the inherited project. That older GitHub release does not expose a release-asset digest through the current metadata API, so real runtime readiness and functional synthesis are still verified during build/install testing.

## Desktop tools and permissions

Kiki exposes practical local assistant capabilities including clipboard access, approved directory inspection, opening applications and paths, memory, and shell execution.

Shell execution remains protected by a native Run once confirmation before the Electron main process invokes the command.

The audit identified an inherited scheduler flaw: scheduled command tasks can execute later without passing through the shell-command confirmation dialog. As a release safety measure, `schedule_task` and `manage_scheduled_tasks` are removed from the predefined model tool catalog and independently filtered from every model provider until the scheduler is redesigned or gains an equivalent approval boundary.

## Packaging and updates

The packaged product is named Kiki and release artifacts use Kiki filenames for Windows, macOS, and Linux.

The Electron update feed points to `Azimn/AliceMod`. It no longer points to upstream `pmbstyle/Alice`, preventing an upstream Alice release from replacing the fork through automatic update.

The existing `aliceaiapp` application ID is intentionally retained for compatibility and user-data continuity.

## Validation improvements

Both PR builds and tagged release builds run the Go test suite with `go test ./...` in addition to the frontend Vitest suite. Tagged releases use `npm ci` for lockfile-reproducible dependency installation.

## Known release-candidate limitations

GitHub Actions must be enabled for the fork and the Windows, macOS, and Linux validation matrix must pass before this candidate should be called a validated public release.

For the intended local Windows installation, the next required validation is an actual clean build and smoke test on the target machine using the release checklist.

Some internal names still contain Alice for compatibility, including `AliceSettings`, `alice-ai-app`, selected IPC/protocol identifiers, backend executable names, and the existing app ID. Those names are not treated as product-identity defects for this local Kiki implementation.

## Upstream credit

Kiki is derived from the MIT-licensed Alice project by pmbstyle. The upstream repository remains available at `https://github.com/pmbstyle/Alice`.
