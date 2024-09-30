package com.parkpulse.client

import com.parkpulse.sessionmanager.UserPermission
import com.parkpulse.sessionmanager.UserLoginCredentials

interface AccessManagerClientInterface {
    fun authenticate(userLoginCredentials: UserLoginCredentials): UserPermission
}