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
            .cors()  // verwendet CorsConfig
            .and()
            .authorizeHttpRequests(authz -> authz
                .antMatchers("/api/**").permitAll()
                .anyRequest().permitAll()
            );
        return http.build();
    }
}
