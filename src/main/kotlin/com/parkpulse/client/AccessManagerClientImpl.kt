package com.parkpulse.client

import com.parkpulse.sessionmanager.DataSource
import com.parkpulse.sessionmanager.UserPermission
import com.parkpulse.sessionmanager.UserLoginCredentials

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestTemplate



class AccessManagerClientImpl(
    private val baseUrl: String,
    private val restTemplate: RestTemplate
) : AccessManagerClientInterface {

    private val logger: Logger = LoggerFactory.getLogger(AccessManagerClientImpl::class.java)

    override fun authenticate(userLoginCredentials: UserLoginCredentials): UserPermission {
        logger.info("Authenticating user ${userLoginCredentials.username} with Access Manager at $baseUrl")

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

            // Log if the authentication failed
            val userPermission = response.body!!
            if (!userPermission.authenticated) {
                logger.warn("User ${userLoginCredentials.username} failed to authenticate with Access Manager")
            } else {
                // Log success if authentication passed
                logger.info("User ${userLoginCredentials.username} authenticated successfully by Access Manager")
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


}