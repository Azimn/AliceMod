# Kiki

Kiki is a local-first desktop AI assistant for Windows, macOS, and Linux, built from the open-source Alice project.

This fork is focused on making the assistant useful without requiring metered AI API usage. The baseline configuration uses Ollama for the language model, local Whisper for speech recognition, Piper for speech synthesis, and local embeddings for memory and RAG. Cloud providers remain optional.

## What Kiki can do

- Converse through text or voice.
- Use Ollama or LM Studio as a local LLM backend.
- Listen for the wake word `kiki` using a lightweight first-stage local transcription probe before running the selected full Whisper model.
- Store and recall long-term memories locally.
- Use local document RAG.
- Open approved files, folders, applications, and URLs.
- Read and write the clipboard.
- Inspect approved directories.
- Execute shell commands only after a native per-command confirmation.
- Use optional Gmail, Google Calendar, browser-context, MCP, web-search, and cloud AI integrations when explicitly configured.
- Use custom tools and custom avatars inherited from Alice.

## Local-first safety boundary

Selecting a local service is treated as a cost and privacy boundary. Kiki does not silently switch from local Piper or local embeddings to OpenAI merely because cloud credentials happen to be stored.

Direct shell commands remain protected by an Electron confirmation dialog. The inherited scheduled-command feature is currently blocked from all model providers because the original scheduler can execute persisted shell commands without the same per-command approval gate. Until that path is redesigned, Kiki does not expose `schedule_task` or `manage_scheduled_tasks` to the model.

## First-run configuration

The default stack is:

- AI provider: Ollama
- Assistant model: Ollama's configured default
- Speech-to-text: local Whisper
- Default Whisper model: Base
- Wake word: `kiki`
- Text-to-speech: local Piper
- Embeddings: local

Install and start Ollama before launching Kiki if you want the default local configuration to work immediately. LM Studio is also supported and can be selected in Settings.

Larger Whisper models are downloaded on first use. Tiny English, Base, Small, Medium, and Large v3 are supported. Large models can require substantial disk space and download time.

## Desktop permissions

Kiki separates tool availability from execution permission. A model may be able to request a capability while Electron still requires user confirmation before consequential local actions occur.

Local directory access is approved by root for the current session. Shell commands require an explicit Run once confirmation. Local application or path opening requires confirmation except for validated external web and mail URLs.

## Downloads

Kiki releases are published from this repository:

https://github.com/Azimn/AliceMod/releases

Release artifacts are named:

- `Kiki-Windows-<version>-Setup.exe`
- `Kiki-Mac-<version>-Installer.dmg`
- `Kiki-Linux-<version>.AppImage`

The updater is configured to use `Azimn/AliceMod` releases, not upstream Alice releases.

## Local Windows build and install

Requirements:

- Git
- Node.js 22 or newer
- Go 1.23
- Python 3.11 for native Node module builds
- Ollama or LM Studio for local LLM use

Clone the repository and switch to the Kiki release-candidate branch:

```powershell
git clone https://github.com/Azimn/AliceMod.git
cd AliceMod
git switch agent/local-first-tool-calls
npm ci
```

Download and verify the local embedding assets once:

```powershell
npm run setup:embeddings
```

Then perform the complete local verification and packaging sequence:

```powershell
npm run package:local
```

`package:local` creates a Google-disabled local `app-config.json` only when no real configuration exists, runs the frontend and Go tests, rebuilds Electron native modules, prepares the verified local speech runtime, builds the backend and frontend, and invokes Electron Builder without publishing.

On Windows, a successful build produces:

```text
release\1.5.0\Kiki-Windows-1.5.0-Setup.exe
```

Run that installer to test Kiki. If any test or build step fails, `package:local` stops rather than packaging a known failing candidate.

A real `app-config.json` can still be supplied before packaging if Google integration is desired. The local preparation step never overwrites an existing file.

## Development commands

Run tests without packaging:

```bash
npm run verify:local
```

Build only the Go backend and application pieces:

```bash
npm run build:go
npm run build:web
```

## Current release gate

The repository contains GitHub Actions workflows for Windows, macOS, and Linux PR builds and tagged releases. They run the frontend Vitest suite, `go test ./...`, build the Go backend, rebuild Electron native modules, build the frontend, and package the application.

At the time of this fork hardening work, GitHub Actions is not registered for the fork at the repository level, so those workflows have not yet executed on the Kiki branch. Do not treat a release as fully validated until the three-platform workflow completes successfully.

See `docs/RELEASE_CHECKLIST.md` for the release gate.

## Upstream project and license

Kiki is a fork of Alice by pmbstyle:

https://github.com/pmbstyle/Alice

The upstream project is licensed under the MIT License, which remains included in this repository. Internal compatibility identifiers such as `AliceSettings`, the `alice-ai-app` package name, selected IPC/protocol identifiers, and the existing Electron app ID are intentionally retained where changing them would create migration or compatibility risk without improving the user-facing product.
