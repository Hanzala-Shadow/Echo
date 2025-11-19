package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class SmartReplyResponse {
    @JsonProperty("detected_language")
    private String detectedLanguage;

    @JsonProperty("suggestions")
    private List<String> suggestions;

    public SmartReplyResponse() {}

    public String getDetectedLanguage() { return detectedLanguage; }
    public void setDetectedLanguage(String detectedLanguage) { this.detectedLanguage = detectedLanguage; }
    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
}