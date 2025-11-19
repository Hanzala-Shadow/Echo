package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class SummarizerRequest {
    @JsonProperty("messages")
    private List<MessageData> messages;

    @JsonProperty("mode")
    private String mode = "hybrid";

    @JsonProperty("style")
    private String style = "structured";

    public static class MessageData {
        @JsonProperty("sender_name")
        private String senderName;

        @JsonProperty("content")
        private String content;

        @JsonProperty("time_stamp")
        private String timeStamp;

        public MessageData() {}

        public MessageData(String senderName, String content, String timeStamp) {
            this.senderName = senderName;
            this.content = content;
            this.timeStamp = timeStamp;
        }

        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getTimeStamp() { return timeStamp; }
        public void setTimeStamp(String timeStamp) { this.timeStamp = timeStamp; }
    }

    public SummarizerRequest() {}

    public List<MessageData> getMessages() { return messages; }
    public void setMessages(List<MessageData> messages) { this.messages = messages; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }
}