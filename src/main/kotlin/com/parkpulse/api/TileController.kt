package com.parkpulse.api

import com.parkpulse.sessionmanager.UserCredentials
import com.parkpulse.sessionmanager.sessionManager
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.nio.file.Path
import java.nio.file.Files
import java.nio.file.Paths

private enum class ErrorMessage(val message: String) {
    AUTH_FAILED("Authentication failed"),
    CITY_NOT_FOUND("City not found")
}
class CityNotFoundException(city: String) : RuntimeException("City $city not found")

@RestController
class TileController {
    private val tileRootDir = "H:/imgs/pulse_tiles"
    private val searchAreaManager = SearchAreaManager("searchAreas.json")

    @GetMapping("/tile/{city}/{z}/{x}/{y}", produces = [MediaType.IMAGE_PNG_VALUE, MediaType.APPLICATION_JSON_VALUE])
    fun getTile(@PathVariable city: String,
                @PathVariable z: Int,
                @PathVariable x: Int,
                @PathVariable y: Int,
                @RequestParam("username") username: String,
                @CookieValue("sessionKey") sessionKey: String
    ): ResponseEntity<Any> {

        val userCredentials = UserCredentials(
            username=username,
            sessionKey=sessionKey
        )

        return when {
            // Check valid session
            (!sessionManager.checkValidSession(userCredentials)) -> ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body("""{"error": "${ErrorMessage.AUTH_FAILED.message}"}""")

            // Verify city exists
            (!searchAreaManager.doesCityExist(city)) -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("""{"error": "${ErrorMessage.CITY_NOT_FOUND.message}"}""")

            // Return requested tile
            else -> {
                val filePath = getImageFilePath(city, z, x, y)
                ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(FileSystemResource(filePath))
            }
        }

    }
    fun getImageFilePath(city: String, z: Int, x: Int, y: Int): Path {
        val imageFilename = "img_${x}_${y}.png"
        val fullImagePath = Paths.get(tileRootDir, city, z.toString(), imageFilename)

        return when {
            !searchAreaManager.isInBounds(city, z, x, y) -> Paths.get("./src/main/resources/static/unavailable.png")
            !Files.exists(fullImagePath) -> Paths.get("./src/main/resources/static/blank.png")
            else -> fullImagePath
        }
    }
}