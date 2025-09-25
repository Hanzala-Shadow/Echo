package com.chatapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

import javax.jmdns.JmDNS;
import javax.jmdns.ServiceInfo;
import java.io.IOException;
import java.net.InetAddress;

@Configuration
public class MdnsConfig {

    @Bean(destroyMethod = "close")
    public JmDNS jmDNS() throws IOException {
        // Bind to the local host IP
        InetAddress localHost = InetAddress.getLocalHost();
        JmDNS jmdns = JmDNS.create(localHost);

        // Advertise our chat service on port 8080
        ServiceInfo serviceInfo = ServiceInfo.create(
                "_http._tcp.local.",
                "chat",
                8080,
                "path=/"
        );
        jmdns.registerService(serviceInfo);

        return jmdns;
    }
}
