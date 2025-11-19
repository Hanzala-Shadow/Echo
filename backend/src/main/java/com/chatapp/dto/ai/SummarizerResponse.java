package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SummarizerResponse {
    @JsonProperty("total_messages")
    private Integer totalMessages;

    @JsonProperty("summary")
    private String summary;

    public SummarizerResponse() {}

    public Integer getTotalMessages() { return totalMessages; }
    public void setTotalMessages(Integer totalMessages) { this.totalMessages = totalMessages; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
}