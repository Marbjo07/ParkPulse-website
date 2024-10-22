package com.parkpulse.api

import com.parkpulse.sessionmanager.*
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.awt.image.BufferedImage
import org.mockito.Mockito.*
import org.springframework.boot.test.mock.mockito.MockBean
import javax.imageio.ImageIO
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue


@SpringBootTest
@AutoConfigureMockMvc
class TileControllerTests {

    @Autowired
    lateinit var mockMvc: MockMvc

    private val testUserJSONCredentials = """{"username": "test", "passwordHash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"}"""

    private var sessionKey = ""
    private var sessionKeyCookie = Cookie("sessionKey", "")

    private val validTileRequest = "/tile/stockholm/18/144024/76942"
    private val outOfBoundsRequest = "/tile/stockholm/18/144000/76000"
    private val inBoundsNonExistentRequest = "/tile/stockholm/18/144024/76942"

    @BeforeEach
    fun setup() {
        println(">> Setup")
        // Perform a valid login to obtain the sessionKey cookie
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

        sessionKey = sessionCookie!!.removePrefix("sessionKey=")
        sessionKeyCookie = Cookie("sessionKey", sessionKey)
    }

    @Test
    fun `Assert unauthorized tile request fails`() {
        println(">> Assert unauthorized tile request fails")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(Cookie("sessionKey", ""))
        )
            .andExpect(status().isUnauthorized)
            .andReturn()
    }

    @Test
    fun `Test missing request args`() {
        println(">> Test missing request args")

        mockMvc.perform(
            get("/tile/stockholm/0/0/0")
        )
            .andExpect(status().isBadRequest)
            .andReturn()
    }

    @Test
    fun `Test valid tile request`() {
        println(">> Test valid tile request")

        val response = mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
            .andReturn()
            .response
        println(">> Valid response type received")


        val imageBytes = response.contentAsByteArray
        assertTrue(imageBytes.isNotEmpty(), "no image data found")
        println(">> Non empty response received")


        val inputStream = imageBytes.inputStream()
        val image = ImageIO.read(inputStream)
        assertNotNull(image, "invalid image data")
        println(">> Valid image response received")


        assertEquals(image.width, 256, "invalid image width")
        assertEquals(image.height, 256, "invalid image height")
        println(">> Valid image size received")

        assertEquals(image.type, BufferedImage.TYPE_4BYTE_ABGR, "invalid image type")
    }
    @Test
    fun `Test invalid argument type`() {
        println(">> Test invalid argument type")

        mockMvc.perform(
            get("/tile/stockholm/18/invalid/type")
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isBadRequest)
            .andReturn()
    }

    @Test
    fun `Test user not logged in`() {
        println(">> Test user not logged in")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "unknown_user")
                .cookie(Cookie("sessionKey", ""))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error").value("Authentication failed"))
            .andReturn()
    }

    @Test
    fun `Test session key mismatch`() {
        println(">> Test session key mismatch")

        val invalidSessionKey = Cookie("sessionKey", "invalidKey")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(invalidSessionKey)
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error").value("Authentication failed"))
            .andReturn()
    }

    @Test
    fun `Test session terminated`() {
        println(">> Test session terminated")

        // Disable user session
        sessionManager.disableUserSession("test")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error").value("Authentication failed"))
            .andReturn()

    }

    @Test
    fun `Test mismatch between username and sessionKey`() {
        println(">> Test unauthorized access to city")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "mismatched-username")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error").value("Authentication failed"))
            .andReturn()
    }

    @Test
    fun `Test non-existent city`() {
        println(">> Test non-existent city")

        mockMvc.perform(
            get("/tile/nonExistentCity/18/144024/76942")
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("City not found"))
            .andReturn()
    }

    @Test
    fun `Test non-existent tile inside bounds`() {
        println(">> Test non-existent tile inside bounds")

        mockMvc.perform(
            get(inBoundsNonExistentRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
            .andExpect { result -> assertTrue(result.response.contentAsByteArray.isNotEmpty()) }
            .andReturn()
    }

    @Test
    fun `Test non-existent tile outside bounds`() {
        println(">> Test non-existent tile outside bounds")

        mockMvc.perform(
            get(outOfBoundsRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
            .andExpect { result -> assertTrue(result.response.contentAsByteArray.isNotEmpty()) }
            .andReturn()
    }

    @Test
    fun `Test valid request with filters applied`() {
        println(">> Test valid request with filters applied")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
                .param("residential", "False")
                .param("garages", "True")
                .param("commercial", "False")
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
            .andReturn()
    }

    @Test
    fun `Test valid request without filters`() {
        println(">> Test valid request without filters")

        mockMvc.perform(
            get(validTileRequest)
                .param("username", "test")
                .cookie(sessionKeyCookie)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
            .andReturn()
    }


}