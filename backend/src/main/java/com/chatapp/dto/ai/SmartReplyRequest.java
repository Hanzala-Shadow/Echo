package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SmartReplyRequest {
    @JsonProperty("message")
    private String message;

    @JsonProperty("num_suggestions")
    private Integer numSuggestions = 5;

    public SmartReplyRequest() {}

    public SmartReplyRequest(String message, Integer numSuggestions) {
        this.message = message;
        this.numSuggestions = numSuggestions;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Integer getNumSuggestions() { return numSuggestions; }
    public void setNumSuggestions(Integer numSuggestions) { this.numSuggestions = numSuggestions; }
}