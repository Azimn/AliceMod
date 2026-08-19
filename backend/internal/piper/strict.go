package piper

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// RuntimeReady reports whether the real Piper runtime required for synthesis is
// available. It is deliberately stricter than the legacy IsReady flag, which
// can be true even when initialization fell back after a missing Piper binary.
func (s *TTSService) RuntimeReady() bool {
	if !s.IsReady() || s.config == nil || s.config.PiperPath == "" {
		return false
	}

	info, err := os.Stat(s.config.PiperPath)
	if err != nil || !info.Mode().IsRegular() {
		return false
	}
	if runtime.GOOS != "windows" && info.Mode().Perm()&0o111 == 0 {
		return false
	}

	if runtime.GOOS == "windows" {
		binDir := filepath.Dir(s.config.PiperPath)
		requiredDLLs := []string{
			"espeak-ng.dll",
			"onnxruntime_providers_shared.dll",
			"onnxruntime.dll",
			"piper_phonemize.dll",
		}
		for _, dll := range requiredDLLs {
			if _, err := os.Stat(filepath.Join(binDir, dll)); err != nil {
				return false
			}
		}
	}

	return true
}

// SynthesizeStrict performs real Piper synthesis and surfaces failures. Unlike
// the inherited Synthesize method, it never substitutes generated placeholder
// audio when Piper or a voice model is unavailable.
func (s *TTSService) SynthesizeStrict(
	ctx context.Context,
	text string,
	voice string,
) ([]byte, error) {
	if !s.RuntimeReady() {
		return nil, fmt.Errorf("Piper runtime is not ready")
	}
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	if voice == "" {
		voice = s.config.Voice
		if voice == "" {
			voice = s.defaultVoice
		}
	}

	s.mu.RLock()
	_, exists := s.voices[voice]
	if !exists {
		_, fallbackExists := s.voices[s.defaultVoice]
		if fallbackExists {
			voice = s.defaultVoice
			exists = true
		}
	}
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("voice %q is not available", voice)
	}

	if err := s.ensureVoiceModel(ctx, voice); err != nil {
		return nil, fmt.Errorf("failed to prepare Piper voice %q: %w", voice, err)
	}

	audioData, err := s.synthesizeWithPiper(ctx, text, voice)
	if err != nil {
		return nil, fmt.Errorf("Piper synthesis failed: %w", err)
	}
	if len(audioData) == 0 {
		return nil, fmt.Errorf("Piper synthesis returned no audio")
	}

	return audioData, nil
}
