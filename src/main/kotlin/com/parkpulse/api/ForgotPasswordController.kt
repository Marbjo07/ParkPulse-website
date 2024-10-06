package com.parkpulse.api

import org.springframework.stereotype.Controller

import com.parkpulse.api.UsernameDTO
import com.parkpulse.client.AccessManagerClientImpl
import com.parkpulse.client.accessManagerClient
import com.parkpulse.sessionmanager.UserLoginCredentials
import com.parkpulse.sessionmanager.sessionManager
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*


@Controller
@RequestMapping("")
class ForgotPasswordController {

    private val userSignupTokenMap = mutableMapOf<String, String>()
    private val logger: Logger = LoggerFactory.getLogger(ForgotPasswordController::class.java)


    @GetMapping("/forgot-password-page")
    fun forgotPasswordPage(): String {
        return "password-reset/request-password-reset"
    }

    @PostMapping("/request_password_reset")
    fun requestPasswordReset(@RequestBody usernameDTO: UsernameDTO): ResponseEntity<String> {

        logger.debug("User ${usernameDTO.username} requested a password reset")
        accessManagerClient.requestPasswordReset(usernameDTO)

        return ResponseEntity
            .ok()
            .body("""{"message": "If an account with that email exists, you will receive a password reset email shortly."}""")
    }

    @GetMapping("/password-reset")
    fun passwordReset(model: Model,
                      @RequestParam("email") email: String,
                      @RequestParam("token") token: String
    ): String {
        logger.info("User \"$email\" is resetting their password")

        model.addAttribute("email", email)
        model.addAttribute("token", token)
        // TODO: update automatic for dev and prod
        model.addAttribute("redirectpage", "http://localhost:8080")

        userSignupTokenMap[email] = token

        return "password-reset/reset-password"
    }

    @PostMapping("/complete_user_setup")
    fun completeUserSetup(@RequestBody userLoginCredentials: UserLoginCredentials): ResponseEntity<String> {
        logger.info("User \"${userLoginCredentials.username}\" has submitted a new password or an account is being created")

        val username = userLoginCredentials.username

        if (!userSignupTokenMap.containsKey(username)) {
            logger.warn("User \"${userLoginCredentials.username}\" submitted an invalid token to /complete_user_setup")

            return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("Content-Type", "application/json")
                .body("""{"error": "User not found"}""")
        }

        val token = userSignupTokenMap[username]!!
        val responseMessage = accessManagerClient.finishOnboarding(userLoginCredentials, token = token)

        logger.info("Successfully completed user setup for user \"$username\", account created or new password sat")

        // TODO: This handles errors as ok :[
        return ResponseEntity.ok(responseMessage)
    }

}