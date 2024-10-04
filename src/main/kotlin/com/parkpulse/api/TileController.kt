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
    val residential: Boolean,
    val garages: Boolean,
    val commercial: Boolean
)

@Controller
class TileController {
    private val tileRootDir = "H:/imgs/pulse_tiles"
    private val searchAreaManager = SearchAreaManager("searchAreas.json")
    private val logger: Logger = LoggerFactory.getLogger(TileController::class.java)

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
        val time = System.currentTimeMillis()

        val userCredentials = UserCredentials(
            username=username,
            sessionKey=sessionKey
        )

        val imageFilterFlags = ImageFilterFlags(
            residential=residential ?: true,
            garages=garages ?: true,
            commercial=commercial ?: true
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
                val imageResponse = applyFilters(filePath, imageFilterFlags)

                // Save the modified image to a ByteArrayOutputStream
                val imgStream = ByteArrayOutputStream()
                ImageIO.write(imageResponse, "PNG", imgStream)

                val imageByteStream = imgStream.toByteArray()

                logger.info(
                    "URI {}: RESPONSE TIME {} ms ", (filePath),
                    TimeUnit.MILLISECONDS.toMillis(System.currentTimeMillis() - time)
                )

                ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(imageByteStream)
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

    fun applyFilters(
        imagePath: Path,
        imageFilterFlags: ImageFilterFlags
    ): BufferedImage {
        // Read the image file
        val image: BufferedImage = ImageIO.read(imagePath.toFile())

        // Return if no filters are applied
        if (!(imageFilterFlags.residential || imageFilterFlags.garages || imageFilterFlags.commercial)) {
            return image
        }

        // Convert the image to an RGBA format
        val newImage = BufferedImage(image.width, image.height, BufferedImage.TYPE_INT_ARGB)

        // Iterate through each pixel and apply the filters
        // TODO: double nested loop with condition checks isn't good
        // The 262,144 (256*256*4) conditional checks are hopefully optimized away, in some way
        for (y in 0 until image.height) {
            for (x in 0 until image.width) {
                // Get the pixel color
                val rgba = image.getRGB(x, y)

                // Extract the red, green, blue, and alpha channels
                val red = (rgba shr 16) and 0xFF
                val green = (rgba shr 8) and 0xFF
                val blue = rgba and 0xFF
                val alpha = (rgba shr 24) and 0xFF

                // Apply filters
                val newRed = if (imageFilterFlags.residential) red else 0
                val newGreen = if (imageFilterFlags.garages) green else 0
                val newBlue = if (imageFilterFlags.commercial) blue else 0

                // Determine the new alpha value
                val newAlpha = if (newRed == 0 && newGreen == 0 && newBlue == 0) 0 else alpha

                // Set the new pixel value in the new image
                newImage.setRGB(x, y, (newAlpha shl 24) or (newRed shl 16) or (newGreen shl 8) or newBlue)
            }
        }

        return newImage


    }

}