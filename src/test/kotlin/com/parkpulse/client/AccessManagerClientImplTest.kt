package com.parkpulse.client

import com.parkpulse.sessionmanager.UserPermission
import com.parkpulse.sessionmanager.UserLoginCredentials

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.web.client.RestTemplate
import org.springframework.http.ResponseEntity


class AccessManagerClientImplTest {

    private val restTemplate = mock(RestTemplate::class.java)
    private val baseUrl = "http://localhot:5002"
    private val client = AccessManagerClientImpl(baseUrl, restTemplate)

    @Test
    fun `test successful authentication`() {
        val userLoginCredentials = UserLoginCredentials(username = "admin", passwordHash = "hash")
        val expectedResponse = UserPermission(authenticated = true, isDev = true, allowedDataSource=emptyList())

        // Mock RestTemplate to return successful response
        `when`(restTemplate.postForEntity("$baseUrl/authenticate_user", userLoginCredentials, UserPermission::class.java))
            .thenReturn(ResponseEntity.ok(expectedResponse))

        // Call the client method
        val actualResponse = client.authenticate(userLoginCredentials)

        assertEquals(actualResponse, expectedResponse)
    }

    @Test
    fun `test failed authentication`() {
        val userLoginCredentials = UserLoginCredentials(username = "admin", passwordHash = "hash")
        val expectedResponse = UserPermission(authenticated = false, isDev = false, allowedDataSource=emptyList())

        // Mock RestTemplate to return failed response
        `when`(restTemplate.postForEntity("$baseUrl/authenticate_user", userLoginCredentials, UserPermission::class.java))
            .thenReturn(ResponseEntity.ok(expectedResponse))

        // Call the client method
        val actualResponse = client.authenticate(userLoginCredentials)

        assertEquals(actualResponse, expectedResponse)
    }

    @Test
    fun `test null response from access manager`() {
        val userLoginCredentials = UserLoginCredentials(username = "admin", passwordHash = "hash")

        // Mock RestTemplate to return null response
        `when`(restTemplate.postForEntity("$baseUrl/authenticate_user", userLoginCredentials, UserPermission::class.java))
            .thenReturn(ResponseEntity.ok(null))

        // Call the client method
        val actualResponse = client.authenticate(userLoginCredentials)

        assertEquals(actualResponse, UserPermission(authenticated = false, isDev = false, allowedDataSource=emptyList()))
    }

}