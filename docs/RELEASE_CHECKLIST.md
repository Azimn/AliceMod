# Kiki Release Checklist

A Kiki release is ready only when every required item below is complete.

## Required automated validation

- GitHub Actions is enabled for `Azimn/AliceMod`.
- PR Build Check runs successfully on Windows 2022.
- PR Build Check runs successfully on macOS latest.
- PR Build Check runs successfully on Ubuntu latest.
- `npm ci` completes on all three runners.
- `npm run test` passes.
- `go test ./...` passes.
- Electron native modules rebuild successfully.
- Go backend builds successfully.
- `npm run build:web` succeeds.
- Electron packaging succeeds.

## Local-first smoke test

Perform this on a clean Windows installation or a clean Windows user profile.

- Ollama is installed and running.
- Kiki completes first-run onboarding without an OpenAI API key.
- Kiki discovers or accepts an installed Ollama model.
- Text conversation works through Ollama.
- Local embeddings initialize without cloud fallback.
- Local Piper produces speech without cloud fallback.
- Microphone VAD enters listening state.
- Saying `kiki` triggers the wake path.
- Ambient speech without the wake word is ignored.
- The selected Whisper model is used after wake detection.
- A larger Whisper model can be selected and downloaded on first use.
- Memory save and recall work locally.
- Clipboard read/write works when requested.
- Directory listing asks for permission before reading a new root.
- Opening a local application or path asks for permission.
- Shell execution displays the native Run once confirmation before execution.
- Model-visible tools do not include `schedule_task` or `manage_scheduled_tasks` while scheduled-command approval remains unhardened.

## Cost-boundary checks

Run with a stored OpenAI API key present to test that local selection still wins.

- Local Piper failure does not invoke OpenAI TTS.
- Local embedding failure does not invoke OpenAI embeddings.
- Google TTS failure does not silently switch to OpenAI.
- Ollama and LM Studio requests do not dump full prompt/context payloads to the console.

## Packaging and update checks

- Product name shown by installers is Kiki.
- Windows artifact is named `Kiki-Windows-<version>-Setup.exe`.
- macOS artifact is named `Kiki-Mac-<version>-Installer.dmg`.
- Linux artifact is named `Kiki-Linux-<version>.AppImage`.
- Update metadata points to `Azimn/AliceMod`.
- A production build does not query or install releases from `pmbstyle/Alice`.
- Existing Electron app ID compatibility is intentionally retained.
- Existing user data survives an upgrade from an earlier AliceMod/Kiki build.

## Branding checks

- Main window title says Kiki.
- Settings window title says Kiki.
- Default persona identifies herself as Kiki.
- Default wake word is `kiki`.
- Onboarding identifies the assistant as Kiki.
- Native command and directory permission dialogs identify the assistant as Kiki.
- Remaining `Alice` identifiers are either internal compatibility names or explicit upstream attribution.

## Release preparation

- PR diff is reviewed for accidental unrelated replacements.
- PR description matches implemented behavior.
- No unresolved review threads remain.
- Release notes describe local-first defaults, provider cost boundaries, wake-word changes, Whisper model selection, safety restrictions, and updater isolation.
- The release tag matches the package version used by Electron Builder.
- All release artifacts are attached to the GitHub release.
- Automatic update from the newly published Kiki release is tested from the previous Kiki build.

## Known limitation that blocks claiming full release readiness

Until GitHub Actions is enabled and the three-platform workflow has completed successfully, the branch may be considered a release candidate but not a validated release.
