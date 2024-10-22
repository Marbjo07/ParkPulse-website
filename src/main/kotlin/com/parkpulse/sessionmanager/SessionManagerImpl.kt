package com.parkpulse.sessionmanager

import org.slf4j.Logger
import org.slf4j.LoggerFactory

class SessionManagerImpl {
    private var userSessions: MutableMap<String, UserSession> = mutableMapOf()
    private val logger: Logger = LoggerFactory.getLogger(SessionManagerImpl::class.java)

    fun createUserSession(username: String, allowedDataSource: List<DataSource>, isDev: Boolean): String {
        val userSession = UserSession(allowedDataSource, isDev)

        userSessions[username] = userSession

        return userSession.getSessionKey()
    }

    fun isValidSession(username: String): Boolean {
        return userSessions.containsKey(username)
    }

    fun checkValidSession(userCredentials: UserCredentials): Boolean {
        val userSession = userSessions[userCredentials.username]
        if (userSession == null) {
            logger.run {
                info("All users ${userSessions.keys.distinct()}")
                error("Unable to find user ${userCredentials.username} when validating user session, user credentials ${userCredentials.sessionKey}")
            }
            return false
        }
        return userSession.isCorrectSessionKey(userCredentials.sessionKey)
    }

    fun getCitiesForUser(userCredentials: UserCredentials): List<String> {
        val isValidSession = checkValidSession(userCredentials)

        if (!isValidSession) {
            return emptyList()
        }

        // Get user session
        val userSession = this.userSessions[userCredentials.username]!!

        // List data sources with type "city"
        val citiesForUser = userSession.getDataSourcesByType(dataSourceType = "city")

        return citiesForUser
    }

    fun authorizeUserRequest(username:String, request:DataSource, sessionKey:String): Boolean {
        val userSession = userSessions[username]!!

        val hasAccess = userSession.checkAccess(
            request = request,
            sessionKey = sessionKey
        )

        return hasAccess
    }

    fun disableUserSession(username:String) {
        userSessions.remove(username)
    }
}