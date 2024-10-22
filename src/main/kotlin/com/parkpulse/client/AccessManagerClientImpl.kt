package com.parkpulse.client

import com.parkpulse.api.UsernameDTO
import com.parkpulse.sessionmanager.DataSource
import com.parkpulse.sessionmanager.UserPermission
import com.parkpulse.sessionmanager.UserLoginCredentials

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestTemplate

data class UserOnboardingDTO (
    val username: String,
    val passwordHash: String,
    val token: String
);

data class ErrorSuccessMessageDTO (
    val message: String?,
    val error: String?,
)


class AccessManagerClientImpl(
    private val baseUrl: String,
    private val restTemplate: RestTemplate
) : AccessManagerClientInterface {

    private val skipUserAuthentication: Boolean = System.getenv("SKIP_USER_AUTHENTICATION").toBoolean() ?: false

    private val logger: Logger = LoggerFactory.getLogger(AccessManagerClientImpl::class.java)

    override fun authenticate(userLoginCredentials: UserLoginCredentials): UserPermission {
        logger.info("Authenticating user ${userLoginCredentials.username} with Access Manager at $baseUrl")
        
        if (skipUserAuthentication) {
            return createSuperUserPermission()
        }

        try {
            val response = restTemplate.postForEntity("$baseUrl/authenticate_user", userLoginCredentials, UserPermission::class.java)

            // Handle a null response, log error and return unauthenticated user
            if (response.body == null) {
                logger.error("Null response received from Access Manager (at /authenticate_user) for user: ${userLoginCredentials.username}")
                return UserPermission(
                    authenticated = false,
                    isDev = false,
                    allowedDataSource = emptyList<DataSource>()
                )
            }

            val userPermission = response.body!!
            if (!userPermission.authenticated) {
                // Log if the authentication failed
                logger.warn("User \"${userLoginCredentials.username}\" failed to authenticate with Access Manager")
            } else {
                // Log success if authentication passed
                logger.info("User \"${userLoginCredentials.username}\" authenticated successfully by Access Manager")
            }

            return userPermission

        } catch (e: RestClientException) {
            logger.error("Error communicating with Access Manager (at /authenticate_user) for user: ${userLoginCredentials.username}. Exception: ${e.message}", e)
            return UserPermission(
                authenticated = false,
                isDev = false,
                allowedDataSource = emptyList<DataSource>()
            )
        }
    }

    fun createSuperUserPermission(): UserPermission {
        return UserPermission(
            authenticated = true,
            isDev = true,
            allowedDataSource = listOf(DataSource(
                dataType = "city",
                dataId = listOf("malmo", "gothenburg", "stockholm", "munich"),
            ))
        ) 
    }

    override fun requestPasswordReset(usernameDTO: UsernameDTO)  {
        val response = restTemplate.postForEntity("$baseUrl/request_password_reset", usernameDTO, ErrorSuccessMessageDTO::class.java)
    }

    override fun finishOnboarding(userLoginCredentials: UserLoginCredentials, token: String): String {
        logger.info("Finishing onboarding for user \"${userLoginCredentials.username}\"")

        val userOnboardingDTO = UserOnboardingDTO(
            username = userLoginCredentials.username,
            passwordHash = userLoginCredentials.passwordHash,
            token = token,
        )

        val response = restTemplate.postForEntity("$baseUrl/finish_onboarding", userOnboardingDTO, ErrorSuccessMessageDTO::class.java)

        val message = response.body?.message ?: response.body?.error
        return message!!
    }


}