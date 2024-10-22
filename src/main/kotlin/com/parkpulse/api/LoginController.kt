package com.parkpulse.api

import com.parkpulse.client.ErrorSuccessMessageDTO
import com.parkpulse.client.accessManagerClient
import com.parkpulse.sessionmanager.*
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.MediaType
import org.springframework.http.HttpHeaders
import jakarta.validation.constraints.*
import okhttp3.internal.userAgent
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate
import java.net.URLEncoder

data class UsernameDTO (
    @NotBlank(message = "Username cannot be blank")
    val username: String
)

data class BRFRequestDTO (
    @NotBlank(message = "Username cannot be blank")
    val username: String,

    @NotBlank(message = "Address cannot be blank")
    val address: String
)

data class AzureKeyRequestDTO (
    @NotBlank(message = "Username cannot be blank")
    val username: String,

    @NotBlank(message = "City cannot be blank")
    val city: String
)

@RestController
class LoginController {

    private val logger: Logger = LoggerFactory.getLogger(LoginController::class.java)

    @Value("\${app.brfEngineLocation}")
    private lateinit var brfEngineLocation: String

    @PostMapping("/login")
    fun login(
        @RequestBody userLoginCredentials: UserLoginCredentials,
        httpServletResponse: HttpServletResponse
    ): ResponseEntity<String> {
        println("Login attempt with credentials: $userLoginCredentials")

        val userPermission: UserPermission = accessManagerClient.authenticate(userLoginCredentials)

        if (!userPermission.authenticated) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication failed")
        }

        // Create session key
        val userSessionKey = sessionManager.createUserSession(
            username = userLoginCredentials.username,
            isDev = userPermission.isDev,
            allowedDataSource = userPermission.allowedDataSource
        )
        // Package session key as a cookie
        val cookie = createSessionCookie(httpServletResponse, userSessionKey)

        return ResponseEntity.ok("Logged in successfully")

    }

     @PostMapping("/cities")
     fun listAvailableCities(
         @RequestBody usernameDTO: UsernameDTO,
         @CookieValue("sessionKey") sessionKey: String,
     ): ResponseEntity<String> {
         logger.info("Listing cities for user \"${usernameDTO.username}\"")

         // Construct user credentials
         val userCredentials = UserCredentials(
             username=usernameDTO.username,
             sessionKey=sessionKey
         )

         // Verify that a valid session was given
         val hasValidSession = sessionManager.checkValidSession(userCredentials);
         if (!hasValidSession) {
             logger.error("Invalid session for user \"${usernameDTO.username}\" was passed to /cities")
             return ResponseEntity
                 .status(HttpStatus.UNAUTHORIZED)
                 .header("Content-Type", "application/json")
                 .body("""{"error":"invalid or expired session"}""")
         }

         // List cities and return
         val availableCities = sessionManager.getCitiesForUser(userCredentials)
         logger.info("Successfully listed ${availableCities.size} number of cities for user ${usernameDTO.username}")

         val citiesJson = availableCities.joinToString(prefix= "[", postfix = "]"){ "\"$it\""}

         return ResponseEntity
             .status(HttpStatus.OK)
             .header("Content-Type", "application/json")
             .body("""{"cities":$citiesJson}""")

     }


    @PostMapping("/azure_key")
    fun getAzureKey(
        @RequestBody azureKeyRequestDTO: AzureKeyRequestDTO,
        @CookieValue("sessionKey") sessionKey: String,
    ): ResponseEntity<String> {
        val username = azureKeyRequestDTO.username
        logger.info("User \"${username}\" requested azure key for city \"${azureKeyRequestDTO.city}\"")

        // Validate session
        if (!isValidSession(username, sessionKey)) {
            return invalidSessionResponse(username, "/azure_key")
        }

        logger.info("Returning azure key to user \"${username}\" for city \"${azureKeyRequestDTO.city}\"")

        // Get azure key and return
        val azureKey = System.getenv("AZURE_KEY_DEV") ?: ""
        if (azureKey == "") {
            logger.warn("Returning empty azure key to user!");
        }

        return ResponseEntity.ok().header("Content-Type", "application/json")
            .body("""{"azure_key":"$azureKey"}""")
    }

    @PostMapping("/disable_user_session")
    fun disableUserSession(@RequestBody username: String, @RequestBody authStr: String): ResponseEntity<String> {
        // TODO: verify caller using authStr
        sessionManager.disableUserSession(username)

        return ResponseEntity
            .status(HttpStatus.OK)
            .header("Content-Type", "application/json")
            .body("""{"message": "Disabled user session successfully"}""")
    }
    @PostMapping("/get_brf")
    fun getBrf(
        @RequestBody brfRequestDTO: BRFRequestDTO,
        @CookieValue("sessionKey") sessionKey: String,
    ): ResponseEntity<String> {
        logger.info("Finding brf for user \"${brfRequestDTO.username}\"")

        val username = brfRequestDTO.username
        if (!isValidSession(username, sessionKey)) {
            return invalidSessionResponse(username, "/get_brf")
        }
        val restTemplate = RestTemplate()

        val encodedAddress = URLEncoder.encode(brfRequestDTO.address, "UTF-8")
        val requestUrl = """$brfEngineLocation/get_brf?address="$encodedAddress""""
        val response = restTemplate.getForEntity(requestUrl, String::class.java)

        println(response)
        return response
    }


    // --- Utility Methods ---
    private fun createSessionCookie(httpServletResponse: HttpServletResponse, sessionKey: String) {
        val cookie = Cookie("sessionKey", sessionKey).apply {
            path = "/"
            isHttpOnly = true
            maxAge = 60 * 60 * 12
            secure = true
        }

        httpServletResponse.setHeader(
            "Set-Cookie",
            "${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Path=${cookie.path}; HttpOnly; SameSite=Strict"
        )
    }

    private fun isValidSession(username: String, sessionKey: String): Boolean {
        return sessionManager.checkValidSession(UserCredentials(username, sessionKey))
    }

    private fun invalidSessionResponse(username: String, endpoint: String): ResponseEntity<String> {
        logger.error("Invalid session for user \"$username\" was passed to $endpoint")
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .header("Content-Type", "application/json")
            .body("""{"error":"invalid or expired session"}""")
    }
}

