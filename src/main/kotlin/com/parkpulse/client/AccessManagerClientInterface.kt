package com.parkpulse.client

import com.parkpulse.api.UsernameDTO
import com.parkpulse.sessionmanager.UserPermission
import com.parkpulse.sessionmanager.UserLoginCredentials

interface AccessManagerClientInterface {
    fun authenticate(userLoginCredentials: UserLoginCredentials): UserPermission

    fun requestPasswordReset(usernameDTO: UsernameDTO)

    fun finishOnboarding(userLoginCredentials: UserLoginCredentials, token: String): String
}