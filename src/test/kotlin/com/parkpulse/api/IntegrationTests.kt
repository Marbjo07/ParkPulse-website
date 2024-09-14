package com.parkpulse.api

import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.hamcrest.Matchers.containsString
import org.springframework.http.MediaType

@SpringBootTest()
@AutoConfigureMockMvc
class IntegrationTests {

    @Autowired
    lateinit var mockMvc: MockMvc

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
    fun `Assert empty login attempt`() {
        println(">> Assert empty login attempt fails")

        mockMvc.perform(
            post("/login")
        )
            .andExpect(status().isBadRequest)
            .andReturn()
    }


    @Test
    fun `Assert invalid login`() {
        println(">> Assert invalid login fails")

        mockMvc.perform(
            post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"username": "test", "password": "password"}""")
        )
            .andExpect(status().isUnauthorized)
            .andReturn()
    }

    @AfterAll
    fun teardown() {
        println(">> Tear down")
    }
}
