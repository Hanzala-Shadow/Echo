package com.chatapp.service.ai;

import com.chatapp.config.AIServiceConfig;
import com.chatapp.dto.ai.*;
import com.chatapp.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AIServiceGateway {

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private AIServiceConfig aiServiceConfig;

    /**
     * Check if AI is enabled for a group
     */
    public boolean isAIEnabled(Long groupId) {
        return groupRepository.findAiEnabledByGroupId(groupId).orElse(false);
    }

    /**
     * Translate text
     */
    public TranslationResponse translate(TranslationRequest request) {
        try {
            String url = aiServiceConfig.getTranslationUrl() + "/translate";
            System.out.println("Calling translation service at: " + url);
            System.out.println("Request text: " + request.getText());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<TranslationRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<TranslationResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    TranslationResponse.class
            );

            System.out.println("Translation service responded: " + response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Translation service error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Translation service error: " + e.getMessage(), e);
        }
    }

    /**
     * Summarize conversation
     */
    public SummarizerResponse summarize(SummarizerRequest request) {
        try {
            String url = aiServiceConfig.getSummarizerUrl() + "/summarize";
            System.out.println("Calling summarizer service at: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<SummarizerRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<SummarizerResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    SummarizerResponse.class
            );

            System.out.println("Summarizer service responded: " + response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Summarizer service error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Summarizer service error: " + e.getMessage(), e);
        }
    }

    /**
     * Check toxicity
     */
    public ToxicityResponse checkToxicity(ToxicityRequest request) {
        try {
            String url = aiServiceConfig.getToxicityUrl() + "/detect_toxicity";
            System.out.println("Calling toxicity service at: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<ToxicityRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<ToxicityResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    ToxicityResponse.class
            );

            System.out.println("Toxicity service responded: " + response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Toxicity service error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Toxicity service error: " + e.getMessage(), e);
        }
    }

    /**
     * Extract deadlines
     */
    public DeadlineResponse extractDeadlines(DeadlineRequest request) {
        try {
            String url = aiServiceConfig.getDeadlineUrl() + "/extract_deadlines";
            System.out.println("Calling deadline service at: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<DeadlineRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<DeadlineResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    DeadlineResponse.class
            );

            System.out.println("Deadline service responded: " + response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Deadline service error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Deadline service error: " + e.getMessage(), e);
        }
    }

    /**
     * Generate smart replies
     */
    public SmartReplyResponse generateSmartReplies(SmartReplyRequest request) {
        try {
            String url = aiServiceConfig.getSmartReplyUrl() + "/smart-reply";
            System.out.println("Calling smart reply service at: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<SmartReplyRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<SmartReplyResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    SmartReplyResponse.class
            );

            System.out.println("Smart reply service responded: " + response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Smart reply service error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Smart reply service error: " + e.getMessage(), e);
        }
    }
}