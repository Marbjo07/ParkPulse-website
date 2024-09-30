package com.parkpulse.sessionmanager

import com.parkpulse.sessionmanager.UserSession

interface SessionManagerInterface {
    fun createUserSession(username: String): String

    fun checkSession(username:String): Boolean

    fun checkValidSession(userSession: UserSession): Boolean

    fun getCitiesForUser(userSession: UserSession): List<String>

    fun disableUserSession(username:String)
}