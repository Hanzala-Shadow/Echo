package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class DeadlineRequest {
    @JsonProperty("messages")
    private List<MessageData> messages;

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

    public DeadlineRequest() {}

    public List<MessageData> getMessages() { return messages; }
    public void setMessages(List<MessageData> messages) { this.messages = messages; }
}