package com.chatapp.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class NetworkController {

    // Inject HOST_IP (from Docker env / script)
    @Value("${HOST_IP}")
    private String hostIp;

    @GetMapping("/network/ip")
    public Map<String, String> getServerIp() {
        Map<String, String> response = new HashMap<>();
        response.put("ip", hostIp);
        response.put("frontendUrl", "http://" + hostIp + ":5173");   // for QR & UI access
        response.put("backendUrl", "http://" + hostIp + ":8080/api"); // for API calls
        return response;
    }
}
