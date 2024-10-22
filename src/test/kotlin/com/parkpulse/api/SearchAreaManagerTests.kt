package com.parkpulse.api

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import kotlin.math.pow
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

const val DEFAULT_ZOOM_LEVEL = 18

class SearchAreaManagerTests {

    private val searchAreaManager = SearchAreaManager("./src/test/resources/sampleSearchAreas.json")
    @BeforeAll
    fun setup() {
        println(">> Setup")
    }

    @Test
    fun `Test every city is loaded`() {
        assertNotNull(searchAreaManager)
        assertTrue(searchAreaManager.doesCityExist("stockholm"))
        assertTrue(searchAreaManager.doesCityExist("gothenburg"))
    }

    @ParameterizedTest()
    @ValueSource(ints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    fun `Test zoom levels`(z: Int) {
        assertEquals(searchAreaManager.isInBounds("stockholm", z, 0, 0), z in 8..18)
    }

    @ParameterizedTest()
    @ValueSource(ints = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    fun `Test point inside stockholm`(z:Int) {
        val x = 50000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()
        val y = 70000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()

        println(">> $z : ($x, $y)")

        assertTrue(searchAreaManager.isInBounds("stockholm", z, x, y))
    }

    @ParameterizedTest()
    @ValueSource(ints = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    fun `Test point inside gothenburg`(z:Int) {
        val x = 130000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()
        val y = 1200000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()

        println(">> $z : ($x, $y)")

        assertTrue(searchAreaManager.isInBounds("gothenburg", z, x, y))
    }

    @ParameterizedTest()
    @ValueSource(ints = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    fun `Test point outside stockholm`(z:Int) {
        val x = 500000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()
        val y = 700000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()

        println(">> $z : ($x, $y)")

        assertFalse(searchAreaManager.isInBounds("stockholm", z, x, y))
    }


    @ParameterizedTest()
    @ValueSource(ints = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    fun `Test point outside gothenburg`(z:Int) {
        val x = 13000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()
        val y = 12000 / 2.0.pow(DEFAULT_ZOOM_LEVEL - z.toDouble()).toInt()

        println(">> $z : ($x, $y)")

        assertFalse(searchAreaManager.isInBounds("gothenburg", z, x, y))
    }

    @Test
    fun `Test point on edge`() {
        var x = 100000
        var y = 700000
        val z = 18

        assertFalse(searchAreaManager.isInBounds("gothenburg", z, x, y))
        assertTrue(searchAreaManager.isInBounds("stockholm", z, x, y))

        x+=2

        assertFalse(searchAreaManager.isInBounds("gothenburg", z, x, y))
        assertFalse(searchAreaManager.isInBounds("stockholm", z, x, y))


        y+=1

        assertTrue(searchAreaManager.isInBounds("gothenburg", z, x, y))
        assertFalse(searchAreaManager.isInBounds("stockholm", z, x, y))


        x+=1

        assertTrue(searchAreaManager.isInBounds("gothenburg", z, x, y))
        assertFalse(searchAreaManager.isInBounds("stockholm", z, x, y))
    }
}