package com.parkpulse.api

import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*


@SpringBootTest
@AutoConfigureMockMvc
class IntegrationTests {

    @Autowired
    lateinit var mockMvc: MockMvc

    private val testUserJSONCredentials = """{"username": "test", "passwordHash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"}"""

    @BeforeAll
    fun setup() {
        println(">> Setup")
    }

    @Test
    fun `Assert login page load and signed`() {
        println(">> Assert login page load and signed")

        // Define the expected content as a flattened string
        val expectedHtml = """<div id="signature"><p>Created by Marius Bjørhei</p><p>Contact: marius.bjorhei@gmail.com</p></div>"""
        val flattenedExpectedHtml = expectedHtml.replace(Regex("\\s+"), "")

        val result = mockMvc.perform(get("/"))
            .andExpect(status().isOk)
            .andReturn()

        // Get the response content and flatten it
        val actualContent = result.response.contentAsString
        val flattenedActualContent = actualContent.replace(Regex("\\s+"), "")

        // Assert that the actual content contains the expected content
        assert(flattenedActualContent.contains(flattenedExpectedHtml)) { "Response content does not match expected HTML" }
    }

    @Test
    fun `Assert empty login attempt fails`() {
        println(">> Assert empty login attempt fails")

        mockMvc.perform(
            post("/login")
        )
            .andExpect(status().isBadRequest)
            .andReturn()
    }

    @Test
    fun `Assert invalid login fails`() {
        println(">> Assert invalid login fails")

        mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"username": "test", "passwordHash": "password"}""")
        )
            .andExpect(status().isUnauthorized)
            .andReturn()
    }

    @Test
    fun `Assert valid login succeeds`() {
        println(">> Assert valid login succeeds")

        mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)

                .content(testUserJSONCredentials)
        )
            .andExpect(status().isOk)
            .andReturn()
    }

    @Test
    fun `Assert valid login returns secure cookie`() {
        println(">> Assert valid login returns secure cookie")

        mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(testUserJSONCredentials)
        )
            .andExpect(status().isOk)
            .andExpect(header().exists("Set-Cookie")) // Check if Set-Cookie is present
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("SameSite=Strict"))) // Check if Set-Cookie contains SameSite=Strict
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly"))) // Check if HttpOnly is present
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("sessionKey"))) // Check if HttpOnly is present
    }

    @Test
    fun `Assert endpoint cities returns all cities`() {
        println(">> Assert endpoint cities returns all cities")

        // First, perform a valid login to obtain the sessionKey cookie
        val loginResult = mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(testUserJSONCredentials)
        )
            .andExpect(status().isOk)
            .andExpect(header().exists("Set-Cookie"))
            .andReturn()

        val sessionCookie = loginResult.response.getHeader("Set-Cookie")
            ?.split(";")?.first { it.startsWith("sessionKey=") } // Extract sessionKey

        val cookie = Cookie("sessionKey", sessionCookie?.removePrefix("sessionKey="))

        // Use the sessionKey cookie for the cities request
        mockMvc.perform(
            post("/cities")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"username": "test"}""")
                .cookie(cookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.cities").isArray)
            .andExpect(jsonPath("$.cities[0]").exists())
    }

    @ParameterizedTest()
    @ValueSource(strings = ["cities", "azure_key"])
    fun `Assert endpoints denies unauthorized request`(endpointName:String) {
        println(">> Assert list_available_cities denies unauthorized request")

        mockMvc.perform(
            post("/${endpointName}")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"username": "test"}""")
        )
            .andExpect(status().isBadRequest) // Expect bad request if no valid token is provided
    }

    @Test
    fun `Assert endpoint azure_key returns azure key`() {
        println(">> Assert endpoint azure_key returns azure key")

        // First, perform a valid login to obtain the sessionKey cookie
        val loginResult = mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(testUserJSONCredentials)
        )
            .andExpect(status().isOk)
            .andExpect(header().exists("Set-Cookie"))
            .andReturn()

        val sessionCookie = loginResult.response.getHeader("Set-Cookie")
            ?.split(";")?.first { it.startsWith("sessionKey=") } // Extract sessionKey

        val cookie = Cookie("sessionKey", sessionCookie?.removePrefix("sessionKey="))

        // Use the sessionKey cookie
        mockMvc.perform(
            post("/azure_key")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"username": "test", "city": "stockholm"}""")
                .cookie(cookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.azure_key").exists()) // Check if the azureKey is present in the response
    }


    @AfterAll
    fun teardown() {
        println(">> Tear down")
    }
}
