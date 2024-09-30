package com.parkpulse.sessionmanager

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test


class SessionManagerImplTest {

    @Test
    fun `Test create user session`() {
        val sessionManager = SessionManagerImpl()
        sessionManager.createUserSession(
            username = "bob",
            allowedDataSource = listOf(DataSource(dataType = "city", dataId = listOf("stockholm"))),
            isDev = false
        )

        assertEquals(true, sessionManager.isValidSession(username = "bob"))
    }

    @Test
    fun `Test disable user session`() {
        val sessionManager = SessionManagerImpl()
        sessionManager.createUserSession(
            username = "bob",
            allowedDataSource = listOf(DataSource(dataType = "city", dataId = listOf("stockholm"))),
            isDev = false
        )

        assertEquals(true, sessionManager.isValidSession(username = "bob"))

        sessionManager.disableUserSession(username = "bob")

        assertEquals(false, sessionManager.isValidSession(username="bob"))
    }

    @Test
    fun `Test dev always has access`() {
        val sessionManager = SessionManagerImpl()
        val userSessionKey = sessionManager.createUserSession(
            username = "bob",
            allowedDataSource = emptyList(),
            isDev = true
        )

        assertEquals(true, sessionManager.authorizeUserRequest(
            username = "bob",
            request = DataSource(dataType = "city", dataId = listOf("stockholm")),
            sessionKey = userSessionKey
        ))


        assertEquals(true, sessionManager.authorizeUserRequest(
            username = "bob",
            request = DataSource(dataType = "nonexistent-type", dataId = listOf("stockholm")),
            sessionKey = userSessionKey
        ))

    }

    @Test
    fun `Assert available cities are returned for user`() {
        val sessionManager = SessionManagerImpl()
        val userSessionKey = sessionManager.createUserSession(
            username = "bob",
            allowedDataSource = listOf(DataSource(dataType = "city", dataId = listOf("stockholm"))),
            isDev = false
        )

        assertEquals(true, sessionManager.isValidSession(username = "bob"))

        val userCredentials = UserCredentials(
            username = "bob",
            sessionKey = userSessionKey
        )

        val availableCities = sessionManager.getCitiesForUser(userCredentials)

        assertEquals(listOf("stockholm"), availableCities)
    }

}