package com.parkpulse.api

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig : WebMvcConfigurer {

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        // Serve static content only when prefixed with /static/
        registry.addResourceHandler("/static/**")
            .addResourceLocations("classpath:/static/")
    }
}