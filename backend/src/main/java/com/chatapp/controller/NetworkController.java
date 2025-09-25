package com.chatapp.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
public class NetworkController {

    @GetMapping("/network/ip")
    public Map<String, String> getServerIp() throws Exception {
        String lanIp = getLocalIp();
        Map<String, String> response = new HashMap<>();
        response.put("ip", lanIp);
        response.put("url", "http://" + lanIp + ":8080");
        return response;
    }

    private String getLocalIp() throws Exception {
        Enumeration<NetworkInterface> nics = NetworkInterface.getNetworkInterfaces();
        while (nics.hasMoreElements()) {
            NetworkInterface nic = nics.nextElement();
            Enumeration<InetAddress> addrs = nic.getInetAddresses();
            while (addrs.hasMoreElements()) {
                InetAddress addr = addrs.nextElement();
                if (!addr.isLoopbackAddress() && addr.isSiteLocalAddress()) {
                    return addr.getHostAddress();
                }
            }
        }
        return InetAddress.getLocalHost().getHostAddress();
    }
}
