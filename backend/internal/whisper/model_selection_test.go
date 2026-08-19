package whisper

import "testing"

func TestResolveWhisperModelAllowsConfiguredModels(t *testing.T) {
	tests := map[string]string{
		"whisper-tiny.en": "ggml-tiny.en.bin",
		"whisper-base":    "ggml-base.bin",
		"whisper-small":   "ggml-small.bin",
		"whisper-medium":  "ggml-medium.bin",
		"whisper-large":   "ggml-large-v3.bin",
	}

	for modelID, expectedRemoteFile := range tests {
		t.Run(modelID, func(t *testing.T) {
			spec, err := resolveWhisperModel(modelID)
			if err != nil {
				t.Fatalf("resolveWhisperModel(%q) returned error: %v", modelID, err)
			}
			if spec.RemoteFile != expectedRemoteFile {
				t.Fatalf("resolveWhisperModel(%q) remote file = %q, want %q", modelID, spec.RemoteFile, expectedRemoteFile)
			}
		})
	}
}

func TestResolveWhisperModelDefaultsToBase(t *testing.T) {
	spec, err := resolveWhisperModel("")
	if err != nil {
		t.Fatalf("resolveWhisperModel(\"\") returned error: %v", err)
	}
	if spec.RemoteFile != "ggml-base.bin" {
		t.Fatalf("default remote file = %q, want ggml-base.bin", spec.RemoteFile)
	}
}

func TestResolveWhisperModelRejectsUnknownModel(t *testing.T) {
	if _, err := resolveWhisperModel("../../arbitrary-model"); err == nil {
		t.Fatal("resolveWhisperModel accepted an unknown model identifier")
	}
}
