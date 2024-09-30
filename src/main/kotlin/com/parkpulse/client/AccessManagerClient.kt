package com.parkpulse.client
import org.springframework.web.client.RestTemplate

val accessManagerClient = AccessManagerClientImpl("http://localhost:5002", RestTemplate())