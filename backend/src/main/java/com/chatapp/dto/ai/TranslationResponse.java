package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TranslationResponse {
    @JsonProperty("original_text")
    private String originalText;

    @JsonProperty("translated_text")
    private String translatedText;

    public TranslationResponse() {}

    public String getOriginalText() { return originalText; }
    public void setOriginalText(String originalText) { this.originalText = originalText; }
    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }
}