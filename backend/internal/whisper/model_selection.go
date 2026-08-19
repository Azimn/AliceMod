package whisper

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type whisperModelSpec struct {
	LocalFile  string
	RemoteFile string
}

var whisperModelSpecs = map[string]whisperModelSpec{
	"whisper-tiny.en": {LocalFile: "whisper-tiny.en.bin", RemoteFile: "ggml-tiny.en.bin"},
	"whisper-base":    {LocalFile: "whisper-base.bin", RemoteFile: "ggml-base.bin"},
	"whisper-small":   {LocalFile: "whisper-small.bin", RemoteFile: "ggml-small.bin"},
	"whisper-medium":  {LocalFile: "whisper-medium.bin", RemoteFile: "ggml-medium.bin"},
	"whisper-large":   {LocalFile: "whisper-large.bin", RemoteFile: "ggml-large-v3.bin"},
}

func resolveWhisperModel(modelID string) (whisperModelSpec, error) {
	if strings.TrimSpace(modelID) == "" {
		modelID = "whisper-base"
	}
	spec, ok := whisperModelSpecs[modelID]
	if !ok {
		return whisperModelSpec{}, fmt.Errorf("unsupported whisper model %q", modelID)
	}
	return spec, nil
}

func (s *STTService) ensureWhisperModel(ctx context.Context, modelID string) (string, error) {
	spec, err := resolveWhisperModel(modelID)
	if err != nil {
		return "", err
	}

	modelPath := s.assetManager.GetModelPath(spec.LocalFile)
	if s.assetManager.IsAssetAvailable(modelPath) {
		return modelPath, nil
	}

	modelURL := "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/" + spec.RemoteFile
	log.Printf("Downloading selected Whisper model %s from %s", modelID, modelURL)
	if err := os.MkdirAll(filepath.Dir(modelPath), 0755); err != nil {
		return "", fmt.Errorf("failed to create models directory: %w", err)
	}
	if err := s.downloadFileWithRetry(modelURL, modelPath, 2); err != nil {
		return "", fmt.Errorf("failed to download %s: %w", modelID, err)
	}
	return modelPath, nil
}

func (s *STTService) findWhisperBinary(ctx context.Context) (string, error) {
	embeddedBinaryPath := s.assetManager.GetBinaryPath("whisper")
	if s.assetManager.IsAssetAvailable(embeddedBinaryPath) {
		return embeddedBinaryPath, nil
	}

	possiblePaths := []string{
		"bin/whisper-cli.exe",
		"bin/whisper-command.exe",
		"bin/main.exe",
		"bin/whisper.exe",
	}
	if runtime.GOOS != "windows" {
		possiblePaths = []string{
			"bin/whisper-cli",
			"bin/whisper-command",
			"bin/main",
			"bin/whisper",
		}
	}

	for _, candidate := range possiblePaths {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	if err := s.downloadWhisperBinary(ctx); err != nil {
		return "", fmt.Errorf("no whisper binary found and download failed: %w", err)
	}
	for _, candidate := range possiblePaths {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("no whisper binary found after download")
}

// TranscribeAudioWithLanguageAndModel transcribes audio using an allowlisted
// local Whisper model. The model is downloaded on demand if it is not present.
func (s *STTService) TranscribeAudioWithLanguageAndModel(
	ctx context.Context,
	audioData []byte,
	language string,
	modelID string,
) (string, error) {
	if !s.IsReady() {
		return "", fmt.Errorf("Whisper STT service is not ready")
	}
	if len(audioData) == 0 {
		return "", fmt.Errorf("audio data cannot be empty")
	}

	samples, err := s.convertAudioToSamples(audioData)
	if err != nil {
		return "", fmt.Errorf("failed to convert audio: %w", err)
	}
	if len(samples) == 0 {
		return "", nil
	}

	whisperPath, err := s.findWhisperBinary(ctx)
	if err != nil {
		return "", err
	}
	modelPath, err := s.ensureWhisperModel(ctx, modelID)
	if err != nil {
		return "", err
	}

	tmpDir := os.TempDir()
	stamp := time.Now().UnixNano()
	inputFile := filepath.Join(tmpDir, fmt.Sprintf("whisper_%d.wav", stamp))
	outputBase := filepath.Join(tmpDir, fmt.Sprintf("whisper_%d", stamp))
	outputFile := outputBase + ".txt"
	defer os.Remove(inputFile)
	defer os.Remove(outputFile)

	if err := s.writeWAVFile(inputFile, samples); err != nil {
		return "", fmt.Errorf("failed to write WAV file: %w", err)
	}

	args := []string{"-m", modelPath, "-f", inputFile}
	helpCmd := exec.Command(whisperPath, "--help")
	helpOutput, _ := helpCmd.CombinedOutput()
	if strings.Contains(string(helpOutput), "-otxt") || strings.Contains(string(helpOutput), "otxt") {
		args = append(args, "-otxt")
	}
	args = append(args, "-of", outputBase)
	if language != "" && language != "auto" {
		args = append(args, "-l", language)
	}

	cmd := exec.CommandContext(ctx, whisperPath, args...)
	if runtime.GOOS == "linux" {
		binDir := filepath.Dir(whisperPath)
		cmd.Env = os.Environ()
		ldLibraryPath := binDir
		for _, env := range cmd.Env {
			if strings.HasPrefix(env, "LD_LIBRARY_PATH=") {
				existingPath := strings.TrimPrefix(env, "LD_LIBRARY_PATH=")
				ldLibraryPath = binDir + ":" + existingPath
				break
			}
		}
		cmd.Env = append(cmd.Env, "LD_LIBRARY_PATH="+ldLibraryPath)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("whisper command failed: %w (output: %s)", err, string(output))
	}

	transcription, err := os.ReadFile(outputFile)
	if err != nil {
		return "", fmt.Errorf("failed to read transcription: %w", err)
	}
	return strings.TrimSpace(string(transcription)), nil
}
