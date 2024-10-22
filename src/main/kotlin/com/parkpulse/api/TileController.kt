package com.parkpulse.api

import com.parkpulse.sessionmanager.UserCredentials
import com.parkpulse.sessionmanager.sessionManager
import org.apache.tomcat.util.http.fileupload.ByteArrayOutputStream
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestParam
import java.awt.image.BufferedImage
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO


private enum class ErrorMessage(val message: String) {
    AUTH_FAILED("Authentication failed"),
    CITY_NOT_FOUND("City not found")
}
class CityNotFoundException(city: String) : RuntimeException("City $city not found")

class ImageFilterFlags (
    val includeResidential: Boolean,
    val includeGarages: Boolean,
    val includeCommercial: Boolean
)

@Controller
class TileController {
    private val tileRootDir = "/overlay_tiles"
    private val searchAreaManager = SearchAreaManager("searchAreas.json")
    private val placeholderImages = setOf("blank.png", "unavailable.png")

    @GetMapping("/tile/{city}/{z}/{x}/{y}", produces = [MediaType.IMAGE_PNG_VALUE, MediaType.APPLICATION_JSON_VALUE])
    fun getTile(@PathVariable city: String,
                @PathVariable z: Int,
                @PathVariable x: Int,
                @PathVariable y: Int,
                @RequestParam("username") username: String,

                @RequestParam("residential", required=false) residential: Boolean?,
                @RequestParam("garages",     required=false) garages: Boolean?,
                @RequestParam("commercial",  required=false) commercial: Boolean?,

                @CookieValue("sessionKey") sessionKey: String
    ): ResponseEntity<Any> {
        val userCredentials = UserCredentials(
            username=username,
            sessionKey=sessionKey
        )

        val imageFilterFlags = ImageFilterFlags(
            includeResidential=residential ?: true,
            includeGarages=garages ?: true,
            includeCommercial=commercial ?: true
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
                val tile = retrieveTile(city, x, y, z, imageFilterFlags)

                ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(tile.toByteArray())
            }
        }

    }
    fun getImageFilePath(city: String, z: Int, x: Int, y: Int): Path {
        val imageFilename = "img_${x}_${y}.png"
        val fullImagePath = Paths.get(tileRootDir, city, z.toString(), imageFilename)
        return when {
            !searchAreaManager.isInBounds(city, z, x, y) -> Paths.get("./resources/static/unavailable.png")
            !Files.exists(fullImagePath) -> Paths.get("./resources/static/blank.png")
            else -> fullImagePath
        }
    }

    fun retrieveTile(city: String, x: Int, y: Int, z: Int, imageFilterFlags: ImageFilterFlags): ByteArrayOutputStream {
        // Read image and apply filters
        val filePath = getImageFilePath(city, z, x, y)
        try {
            var image: BufferedImage = ImageIO.read(filePath.toFile())
                ?: throw IllegalArgumentException("Image not found at path: $filePath")
        
            // Apply filter if not a placeholder image
            if (!placeholderImages.contains(filePath.fileName.toString())) {
                image = applyFilters(image, imageFilterFlags)
            }

            // Write the image to a stream
            val imageStream = ByteArrayOutputStream()
            ImageIO.write(image, "PNG", imageStream)

            return imageStream
        }
        catch (e:javax.imageio.IIOException) {
            println("Could not find file: {}".format(filePath))
        }
        return ByteArrayOutputStream()
    }

    fun applyFilters(
        image: BufferedImage,
        imageFilterFlags: ImageFilterFlags
    ): BufferedImage {
        // Return if no filters are being applied
        if (!(imageFilterFlags.includeResidential || imageFilterFlags.includeGarages || imageFilterFlags.includeCommercial)) {
            return image
        }

        // Create an empty BufferedImage
        val newImage = BufferedImage(image.width, image.height, BufferedImage.TYPE_INT_ARGB)

        // Construct bit mask
        // Each channel is two digits
        // FF enables a channel
        var mask = 0xFF000000.toInt()
        if (imageFilterFlags.includeResidential) {
            mask = mask or 0x00FF0000
        }

        if (imageFilterFlags.includeGarages) {
            mask = mask or 0x0000FF00
        }

        if (imageFilterFlags.includeCommercial) {
            mask = mask or 0x000000FF
        }

        // Iterate through each pixel and apply the mask
        for (y in 0 until image.height) {
            for (x in 0 until image.width) {
                val rgba = image.getRGB(x, y)

                // Apply the mask to preserve only the enabled channels and zero out the rest
                val filteredRgba = (rgba and mask)

                // Set the pixel value
                newImage.setRGB(x, y, filteredRgba)
            }
        }
        return newImage
    }

}