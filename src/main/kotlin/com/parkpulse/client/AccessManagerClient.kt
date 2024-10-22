package com.parkpulse.client
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.client.RestTemplate

val accessManagerClient = AccessManagerClientImpl("http://accessmanager:5000", RestTemplate())