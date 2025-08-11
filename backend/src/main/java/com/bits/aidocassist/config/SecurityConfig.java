package com.bits.aidocassist.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.disable())  // Updated for Spring Security 6.x
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/**").permitAll()  // Updated from antMatchers
                .anyRequest().permitAll()
            );
        return http.build();
    }
}
