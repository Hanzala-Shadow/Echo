package com.chatapp.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class DeadlineResponse {
    @JsonProperty("total_messages")
    private Integer totalMessages;

    @JsonProperty("results")
    private List<DeadlineResult> results;

    public static class DeadlineResult {
        @JsonProperty("sender_name")
        private String senderName;

        @JsonProperty("content")
        private String content;

        @JsonProperty("time_stamp")
        private String timeStamp;

        @JsonProperty("recipient")
        private String recipient;

        @JsonProperty("deadlines_found")
        private Integer deadlinesFound;

        @JsonProperty("deadlines")
        private List<DeadlineItem> deadlines;

        public static class DeadlineItem {
            @JsonProperty("date_text")  
            private String dateText;

            @JsonProperty("parsed_date") 
            private String parsedDate;

            @JsonProperty("context") 
            private String context;

            @JsonProperty("confidence") 
            private Double confidence;

            @JsonProperty("position") 
            private Integer position;

            @JsonProperty("sender_name") 
            private String senderName;

            @JsonProperty("time_stamp")  
            private String timeStamp;

            @JsonProperty("message_content") 
            private String messageContent;

            @JsonProperty("recipient")  
            private String recipient;

            public DeadlineItem() {}

            // Getters and Setters
            public String getDateText() { return dateText; }
            public void setDateText(String dateText) { this.dateText = dateText; }
            
            public String getParsedDate() { return parsedDate; }
            public void setParsedDate(String parsedDate) { this.parsedDate = parsedDate; }
            
            public String getContext() { return context; }
            public void setContext(String context) { this.context = context; }
            
            public Double getConfidence() { return confidence; }
            public void setConfidence(Double confidence) { this.confidence = confidence; }
            
            public Integer getPosition() { return position; }
            public void setPosition(Integer position) { this.position = position; }
            
            public String getSenderName() { return senderName; }
            public void setSenderName(String senderName) { this.senderName = senderName; }
            
            public String getTimeStamp() { return timeStamp; }
            public void setTimeStamp(String timeStamp) { this.timeStamp = timeStamp; }
            
            public String getMessageContent() { return messageContent; }
            public void setMessageContent(String messageContent) { this.messageContent = messageContent; }
            
            public String getRecipient() { return recipient; }
            public void setRecipient(String recipient) { this.recipient = recipient; }
        }

        public DeadlineResult() {}

        // Getters and Setters
        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        
        public String getTimeStamp() { return timeStamp; }
        public void setTimeStamp(String timeStamp) { this.timeStamp = timeStamp; }
        
        public String getRecipient() { return recipient; }
        public void setRecipient(String recipient) { this.recipient = recipient; }
        
        public Integer getDeadlinesFound() { return deadlinesFound; }
        public void setDeadlinesFound(Integer deadlinesFound) { this.deadlinesFound = deadlinesFound; }
        
        public List<DeadlineItem> getDeadlines() { return deadlines; }
        public void setDeadlines(List<DeadlineItem> deadlines) { this.deadlines = deadlines; }
    }

    public DeadlineResponse() {}

    // Getters and Setters
    public Integer getTotalMessages() { return totalMessages; }
    public void setTotalMessages(Integer totalMessages) { this.totalMessages = totalMessages; }
    
    public List<DeadlineResult> getResults() { return results; }
    public void setResults(List<DeadlineResult> results) { this.results = results; }
}