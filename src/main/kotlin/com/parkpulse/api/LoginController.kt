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
        val cookie = Cookie("sessionKey", userSessionKey)
        cookie.path = "/"
        cookie.isHttpOnly = true
        cookie.maxAge = 60 * 60 * 12
        cookie.secure = true

        // Used to set "SameSite"
        httpServletResponse.setHeader(
            "Set-Cookie",
            "${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Path=${cookie.path}; HttpOnly; SameSite=Strict"
        )

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

        // Construct user credentials
        val userCredentials = UserCredentials(
            username=username,
            sessionKey=sessionKey
        )

        // Verify that a valid session was given
        val hasValidSession = sessionManager.checkValidSession(userCredentials);
        if (!hasValidSession) {
            logger.error("Invalid session for user \"${username}\" was passed to /azure_key")
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body("""{"error":"invalid or expired session"}""")
        }

        // Get azure key and return
        val azureKey: String? = System.getenv("AZURE_KEY_DEV")!!

        logger.info("Returning azure key to user \"${username}\" for city \"${azureKeyRequestDTO.city}\"")
        return ResponseEntity
            .status(HttpStatus.OK)
            .header("Content-Type", "application/json")
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

        // Construct user credentials
        val userCredentials = UserCredentials(
            username = brfRequestDTO.username,
            sessionKey = sessionKey
        )

        // Verify that a valid session was given
        val hasValidSession = sessionManager.checkValidSession(userCredentials);
        if (!hasValidSession) {
            logger.error("Invalid session for user \"${brfRequestDTO.username}\" was passed to /get_brf")
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body("""{"error":"invalid or expired session"}""")
        }
        val restTemplate = RestTemplate()

        val response = restTemplate.getForEntity(
            """http://localhost:5001/get_brf?address="${URLEncoder.encode(brfRequestDTO.address, "UTF-8")}"""",
            String::class.java
        )

        println(response)
        return response
    }
}

