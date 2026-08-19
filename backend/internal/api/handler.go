package api

import (
	"encoding/json"
	"net/http"

	"alice-backend/internal/config"
	"alice-backend/internal/models"
)

type Handler struct {
	config       *config.Config
	modelManager *models.Manager
}

func NewHandler(config *config.Config, modelManager *models.Manager) *Handler {
	return &Handler{
		config:       config,
		modelManager: modelManager,
	}
}

func (h *Handler) writeSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func (h *Handler) writeError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

func (h *Handler) writeBinary(w http.ResponseWriter, data []byte, contentType string) {
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	sttService := h.modelManager.GetSTTService()
	ttsService := h.modelManager.GetTTSService()
	embeddingService := h.modelManager.GetEmbeddingService()

	response := map[string]interface{}{
		"status": "healthy",
		"services": map[string]bool{
			"stt":        sttService != nil && sttService.IsReady(),
			"tts":        ttsService != nil && ttsService.RuntimeReady(),
			"embeddings": embeddingService != nil && embeddingService.IsReady(),
		},
	}
	h.writeSuccess(w, response)
}

func (h *Handler) GetConfig(w http.ResponseWriter, r *http.Request) {
	h.writeSuccess(w, h.config)
}

func (h *Handler) STTReady(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.STT {
		h.writeError(w, http.StatusServiceUnavailable, "STT service is disabled")
		return
	}

	sttService := h.modelManager.GetSTTService()
	if sttService == nil || !sttService.IsReady() {
		h.writeError(w, http.StatusServiceUnavailable, "STT service is not ready")
		return
	}

	h.writeSuccess(w, map[string]bool{"ready": true})
}

func (h *Handler) STTInfo(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.STT {
		h.writeError(w, http.StatusServiceUnavailable, "STT service is disabled")
		return
	}

	sttService := h.modelManager.GetSTTService()
	if sttService == nil {
		h.writeError(w, http.StatusServiceUnavailable, "STT service not available")
		return
	}

	h.writeSuccess(w, sttService.GetInfo())
}

func (h *Handler) TTSReady(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil || !ttsService.RuntimeReady() {
		h.writeError(w, http.StatusServiceUnavailable, "Piper TTS runtime is not ready")
		return
	}

	h.writeSuccess(w, map[string]bool{"ready": true})
}

func (h *Handler) TTSInfo(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.TTS {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service is disabled")
		return
	}

	ttsService := h.modelManager.GetTTSService()
	if ttsService == nil {
		h.writeError(w, http.StatusServiceUnavailable, "TTS service not available")
		return
	}

	h.writeSuccess(w, ttsService.GetInfo())
}

func (h *Handler) EmbeddingsReady(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.Embeddings {
		h.writeError(w, http.StatusServiceUnavailable, "Embeddings service is disabled")
		return
	}

	embeddingService := h.modelManager.GetEmbeddingService()
	if embeddingService == nil || !embeddingService.IsReady() {
		h.writeError(w, http.StatusServiceUnavailable, "Embeddings service is not ready")
		return
	}

	h.writeSuccess(w, map[string]bool{"ready": true})
}

func (h *Handler) EmbeddingsInfo(w http.ResponseWriter, r *http.Request) {
	if !h.config.Features.Embeddings {
		h.writeError(w, http.StatusServiceUnavailable, "Embeddings service is disabled")
		return
	}

	embeddingService := h.modelManager.GetEmbeddingService()
	if embeddingService == nil {
		h.writeError(w, http.StatusServiceUnavailable, "Embeddings service not available")
		return
	}

	h.writeSuccess(w, embeddingService.GetInfo())
}
