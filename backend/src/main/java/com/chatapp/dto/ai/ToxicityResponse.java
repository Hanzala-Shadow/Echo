package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ToxicityResponse {

    @JsonProperty("is_toxic")
    private Boolean toxic;

    @JsonProperty("confidence")
    private Double confidence;

    @JsonProperty("label")
    private String label;

    @JsonProperty("message")
    private String message;

    @JsonProperty("action")
    private String action;

    @JsonProperty("action_message")
    private String actionMessage;

    @JsonProperty("translation_used")
    private Boolean translationUsed;

    @JsonProperty("original_text")
    private String originalText;

    @JsonProperty("detection_text")
    private String detectionText;

    @JsonProperty("detection_method")
    private String detectionMethod;

    public ToxicityResponse() {}

    // Getters and Setters

    public Boolean getToxic() { return toxic; }
    public void setToxic(Boolean toxic) { this.toxic = toxic; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActionMessage() { return actionMessage; }
    public void setActionMessage(String actionMessage) { this.actionMessage = actionMessage; }

    public Boolean getTranslationUsed() { return translationUsed; }
    public void setTranslationUsed(Boolean translationUsed) { this.translationUsed = translationUsed; }

    public String getOriginalText() { return originalText; }
    public void setOriginalText(String originalText) { this.originalText = originalText; }

    public String getDetectionText() { return detectionText; }
    public void setDetectionText(String detectionText) { this.detectionText = detectionText; }

    public String getDetectionMethod() { return detectionMethod; }
    public void setDetectionMethod(String detectionMethod) { this.detectionMethod = detectionMethod; }
}
