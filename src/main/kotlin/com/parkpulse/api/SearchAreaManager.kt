package com.parkpulse.api

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import net.bytebuddy.agent.builder.AgentBuilder.FallbackStrategy
import java.io.File
import kotlin.math.pow

const val DEFAULT_ZOOM_LEVEL = 18

class SearchArea (
    private val minX: Int,
    private val maxX: Int,
    private val minY: Int,
    private val maxY: Int,
) {
    // Returns true if given x,y point is within bounds
    fun isInBounds(x: Int, y: Int): Boolean {
        return (x in minX..maxX) && (y in minY..maxY)
    }
}

class SearchAreaManager (
    private val inputFile: String
) {
    private var cityBoundsMap: Map<String, SearchArea>


    init {
        // Read json file
        val file = File(inputFile)
        val jsonString = file.readText()

        // Parse json
        cityBoundsMap = Gson().fromJson(jsonString,
            object: TypeToken<Map<String, SearchArea>>(){}.type
        )
    }

    // Returns if the xy coordinate is within city search bounds
    // Throws CityNotFoundException if city is not found
    fun isInBounds(city: String, z:Int, x: Int, y: Int): Boolean {
        if (z !in 8..18)
            return false


        val bounds = cityBoundsMap[city] ?: throw CityNotFoundException(city=city)

        // Calculate scale factor
        val zoomDif = DEFAULT_ZOOM_LEVEL - z
        val scaleFactor = 2.0.pow(zoomDif.toDouble()).toInt()

        // Check if scaled x and y is inside range of city given
        return bounds.isInBounds(x * scaleFactor, y * scaleFactor)
    }

    fun doesCityExist(city: String): Boolean {
        return cityBoundsMap.containsKey(city)
    }
}