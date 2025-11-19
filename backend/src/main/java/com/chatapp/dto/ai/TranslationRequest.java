package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TranslationRequest {
    @JsonProperty("text")
    private String text;

    public TranslationRequest() {}

    public TranslationRequest(String text) {
        this.text = text;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}