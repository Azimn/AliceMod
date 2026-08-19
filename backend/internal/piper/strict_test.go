package piper

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestRuntimeReadyRejectsMissingPiperBinary(t *testing.T) {
	service := &TTSService{
		ready: true,
		config: &Config{PiperPath: filepath.Join(t.TempDir(), "missing-piper")},
	}

	if service.RuntimeReady() {
		t.Fatal("RuntimeReady returned true for a missing Piper binary")
	}
}

func TestRuntimeReadyAcceptsCompleteRuntime(t *testing.T) {
	dir := t.TempDir()
	binaryName := "piper"
	if runtime.GOOS == "windows" {
		binaryName = "piper.exe"
	}
	binaryPath := filepath.Join(dir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("test"), 0o755); err != nil {
		t.Fatalf("failed to create Piper test binary: %v", err)
	}

	if runtime.GOOS == "windows" {
		requiredDLLs := []string{
			"espeak-ng.dll",
			"onnxruntime_providers_shared.dll",
			"onnxruntime.dll",
			"piper_phonemize.dll",
		}
		for _, dll := range requiredDLLs {
			if err := os.WriteFile(filepath.Join(dir, dll), []byte("test"), 0o644); err != nil {
				t.Fatalf("failed to create %s: %v", dll, err)
			}
		}
	}

	service := &TTSService{
		ready:  true,
		config: &Config{PiperPath: binaryPath},
	}

	if !service.RuntimeReady() {
		t.Fatal("RuntimeReady returned false for a complete test runtime")
	}
}

func TestSynthesizeStrictRejectsUnavailableRuntime(t *testing.T) {
	service := &TTSService{
		ready:        true,
		config:       &Config{PiperPath: filepath.Join(t.TempDir(), "missing-piper")},
		defaultVoice: "en_US-amy-medium",
		voices: map[string]*Voice{
			"en_US-amy-medium": {
				Name:     "en_US-amy-medium",
				Language: "en-US",
			},
		},
	}

	if _, err := service.SynthesizeStrict(context.Background(), "hello", ""); err == nil {
		t.Fatal("SynthesizeStrict returned success without an available Piper runtime")
	}
}
