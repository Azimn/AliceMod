package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

type SynthesizeRequest struct {
	Text  string  `json:"text"`
	Voice string  `json:"voice,omitempty"`
	Speed float32 `json:"speed,omitempty"`
}

type VoiceResponse struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Language    string `json:"language"`
	Gender      string `json:"gender"`
}

func (h *Handler) SynthesizeSpeech(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil || !ttsService.RuntimeReady() {
		h.writeError(w, http.StatusServiceUnavailable, "Piper TTS runtime is not ready")
		return
	}

	var req SynthesizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Text == "" {
		h.writeError(w, http.StatusBadRequest, "Text is required")
		return
	}
	if req.Voice == "" {
		req.Voice = "en_US-amy-medium"
	}

	audioData, err := ttsService.SynthesizeStrict(r.Context(), req.Text, req.Voice)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "TTS synthesis failed: "+err.Error())
		return
	}

	audioNumbers := make([]int, len(audioData))
	for i, b := range audioData {
		audioNumbers[i] = int(b)
	}

	h.writeSuccess(w, map[string]interface{}{
		"audio":       audioNumbers,
		"format":      "wav",
		"sample_rate": 22050,
	})
}

func (h *Handler) GetVoices(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service not available")
		return
	}

	voices := ttsService.GetVoices()
	voiceResponses := make([]VoiceResponse, len(voices))
	for i, voice := range voices {
		voiceResponses[i] = VoiceResponse{
			Name:        voice.Name,
			Description: voice.Description,
			Language:    voice.Language,
			Gender:      voice.Gender,
		}
	}

	h.writeSuccess(w, map[string]interface{}{"voices": voiceResponses})
}

type SetDefaultVoiceRequest struct {
	Voice string `json:"voice"`
}

func (h *Handler) GetDefaultVoice(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service not available")
		return
	}

	h.writeSuccess(w, map[string]interface{}{
		"default_voice": ttsService.GetDefaultVoice(),
	})
}

func (h *Handler) SetDefaultVoice(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil || !ttsService.RuntimeReady() {
		h.writeError(w, http.StatusServiceUnavailable, "Piper TTS runtime is not ready")
		return
	}

	var req SetDefaultVoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Voice == "" {
		h.writeError(w, http.StatusBadRequest, "Voice is required")
		return
	}
	if err := ttsService.SetDefaultVoice(req.Voice); err != nil {
		h.writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.writeSuccess(w, map[string]interface{}{
		"message": "Default voice updated successfully",
		"voice":   req.Voice,
	})
}

func (h *Handler) RegisterTTSRoutes(router *mux.Router) {
	ttsRouter := router.PathPrefix("/api/tts").Subrouter()
	ttsRouter.HandleFunc("/synthesize", h.SynthesizeSpeech).Methods("POST")
	ttsRouter.HandleFunc("/voices", h.GetVoices).Methods("GET")
	ttsRouter.HandleFunc("/default-voice", h.GetDefaultVoice).Methods("GET")
	ttsRouter.HandleFunc("/default-voice", h.SetDefaultVoice).Methods("POST")
}
