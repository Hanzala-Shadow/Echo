package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ToxicityRequest {
    @JsonProperty("text")
    private String text;

    public ToxicityRequest() {}

    public ToxicityRequest(String text) {
        this.text = text;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}