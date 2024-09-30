package com.parkpulse.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.util.Locale

class SnakeCaseStrategy : PropertyNamingStrategies.NamingBase() {
    override fun translate(input: String): String {
        val parts = input.split('_')
        return parts.first() + parts.drop(1).joinToString("") { it.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase(
                Locale.getDefault()
            ) else it.toString()
        } }
    }
}
@Configuration
class JacksonConfig {

    @Bean
    fun objectMapper(): ObjectMapper {
        return jacksonObjectMapper().apply {
            propertyNamingStrategy = SnakeCaseStrategy()
        }
    }
}
