package com.chatapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AIServiceConfig {

    @Value("${ai.translation.url:http://translation_service:8001}")
    private String translationUrl;

    @Value("${ai.summarizer.url:http://summarizer_service:8002}")
    private String summarizerUrl;

    @Value("${ai.toxicity.url:http://toxicity_service:8003}")
    private String toxicityUrl;

    @Value("${ai.deadline.url:http://deadline_service:8004}")
    private String deadlineUrl;

    @Value("${ai.smartreply.url:http://smart_reply_service:8005}")
    private String smartReplyUrl;

    public String getTranslationUrl() {
        return translationUrl;
    }

    public String getSummarizerUrl() {
        return summarizerUrl;
    }

    public String getToxicityUrl() {
        return toxicityUrl;
    }

    public String getDeadlineUrl() {
        return deadlineUrl;
    }

    public String getSmartReplyUrl() {
        return smartReplyUrl;
    }
}