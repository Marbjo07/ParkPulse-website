package com.parkpulse.api

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.EnableWebMvc
import java.io.File
import java.nio.file.Path
import java.nio.file.Paths
import java.text.Normalizer
import kotlin.io.path.exists


fun secureFilename(filename: String): String {
    // Remove accents and special characters
    var cleanName = Normalizer.normalize(filename, Normalizer.Form.NFD)

    // Remove all non-alphanumeric characters except dots and hyphens
    cleanName = cleanName.replace("[^\\w.-]".toRegex(), "")

    // Remove any file path information (secure against directory traversal attacks)
    cleanName = Paths.get(cleanName).fileName.toString()

    // Limit filename length
    if (cleanName.length > 100) {
        cleanName = cleanName.substring(0, 100)
    }

    return cleanName
}


@RestController
class TileController {

    private val logger: Logger = LoggerFactory.getLogger(LoginController::class.java)
    // TODO: use relative path
    private val tileRootDir = "H:/imgs/pulse_tiles"

    @GetMapping("/tile/{city}/{zoomLevel}/{imageName}", produces = [MediaType.IMAGE_PNG_VALUE])
    fun getTile(@PathVariable city: String,
                @PathVariable zoomLevel: Int,
                @PathVariable imageName: String): ResponseEntity<Resource> {

        val secureImageName = secureFilename(imageName)

        val fullImagePath = "$tileRootDir/$city/$zoomLevel/$secureImageName"

        var path: Path = File(fullImagePath).toPath()
        if (!path.exists()) {
            // TODO: use relative path
            path = File("E:/arbeid/parkpulse/parkpulse-web/src/main/resources/static/blank.png").toPath()
        }

        val resource = FileSystemResource(path)

        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .body(resource)
    }

    fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/**")
    }
}