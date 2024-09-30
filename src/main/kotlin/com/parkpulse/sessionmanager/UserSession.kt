package com.parkpulse.sessionmanager

import java.util.UUID.randomUUID

class DataSource(
    val dataType: String,
    val dataId: List<String>
)

data class UserLoginCredentials(
    val username: String,
    val passwordHash: String
)

data class UserCredentials (
    val username: String,
    val sessionKey: String
)

data class UserPermission(
    val authenticated: Boolean,
    val isDev: Boolean,
    val allowedDataSource: List<DataSource>
)

class UserSession(
    private var allowedDataSources: List<DataSource>,
    private val isDev: Boolean
) {
    private var sessionKey = randomUUID().toString()

    private var hasReadSessionKey = false

    // Can only be called once
    fun getSessionKey(): String {
        if (hasReadSessionKey)
            return ""

        hasReadSessionKey = true
        return sessionKey
    }

    fun isCorrectSessionKey(sessionKey: String): Boolean {
        return this.sessionKey == sessionKey
    }

    fun checkAccess(request:DataSource, sessionKey:String): Boolean {
        if (sessionKey != this.sessionKey) {
            return false
        }

        return isDev || request in allowedDataSources
    }

    fun getDataSourcesByType(dataSourceType: String): List<String> {
        val dataSources = mutableListOf<String>()

        for (dataSource in allowedDataSources) {
            if (dataSource.dataType == dataSourceType) {
                for (item in dataSource.dataId) {
                    dataSources.add(item)
                }
            }
        }
        return dataSources
    }
}