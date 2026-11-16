package com.mediaforge.app

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint

object ImageLook {
    fun apply(source: Bitmap, settings: Map<*,*>): Bitmap {
        fun value(key: String, default: Double, min: Double, max: Double): Double =
            ((settings[key] as? Number)?.toDouble() ?: default).also { require(it.isFinite() && it in min..max) }
        require(settings.keys.all { it in listOf("brightness","contrast","saturation","warmth") })
        val brightness = value("brightness",0.0,-1.0,1.0)
        val contrast = value("contrast",1.0,0.0,2.0)
        val saturation = value("saturation",1.0,0.0,2.0)
        val warmth = value("warmth",0.0,-1.0,1.0)
        val matrix = FloatArray(20); matrix[18] = 1f
        val luma = doubleArrayOf(.2126,.7152,.0722)
        for(row in 0..2) {
            val tint = if(row==0) 1+warmth*.15 else if(row==2) 1-warmth*.15 else 1.0
            for(col in 0..2) matrix[row*5+col] = ((luma[col]*(1-saturation)+if(row==col) saturation else 0.0)*contrast*tint).toFloat()
            matrix[row*5+4] = ((.5*(1-contrast)+brightness)*tint*255).toFloat()
        }
        val output = Bitmap.createBitmap(source.width,source.height,Bitmap.Config.ARGB_8888)
        Canvas(output).drawBitmap(source,0f,0f,Paint().apply { colorFilter = ColorMatrixColorFilter(ColorMatrix(matrix)) })
        return output
    }
}
