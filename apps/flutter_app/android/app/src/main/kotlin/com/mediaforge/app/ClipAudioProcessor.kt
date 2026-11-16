package com.mediaforge.app

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import java.nio.ByteBuffer
import kotlin.math.*

/** Bounded, interleaved PCM processing. Each channel has independent filter/delay state. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class ClipAudioProcessor(private val gain: Double, levels: Map<*, *>, private val fadeIn: Double = 0.0, private val fadeOut: Double = 0.0, private val duration: Double = 0.0, private val offset: Double = 0.0) : BaseAudioProcessor() {
    private val effects = levels.mapKeys { it.key.toString() }.mapValues { (_, v) ->
        ((v as? Number)?.toDouble() ?: 0.0).also { require(it.isFinite() && it in 0.0..100.0) } / 100.0
    }
    private var delays = DoubleArray(0)
    private var low = DoubleArray(0)
    private var cursor = 0
    private var samples = 0L
    override fun onConfigure(format: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
        require(gain.isFinite() && gain in 0.0..2.0)
        if (format.encoding != C.ENCODING_PCM_16BIT && format.encoding != C.ENCODING_PCM_FLOAT)
            throw AudioProcessor.UnhandledAudioFormatException(format)
        require(format.channelCount in 1..8 && format.sampleRate in 8000..192000)
        delays = DoubleArray((format.sampleRate * .25).toInt() * format.channelCount)
        low = DoubleArray(format.channelCount); cursor = 0
        return format
    }
    override fun queueInput(input: ByteBuffer) {
        val output = replaceOutputBuffer(input.remaining())
        val channels = inputAudioFormat.channelCount
        val floating = inputAudioFormat.encoding == C.ENCODING_PCM_FLOAT
        val step = if (floating) 4 else 2
        val alpha = 1-exp(-2*PI*250/inputAudioFormat.sampleRate)
        while (input.remaining() >= step) {
            val x = if (floating) input.float.toDouble() else input.short / 32768.0
            val channel = cursor % channels
            low[channel] += alpha * (x-low[channel])
            fun level(key: String) = effects[key] ?: 0.0
            fun delayed(seconds: Double): Double {
                val offset = (seconds*inputAudioFormat.sampleRate).toInt()*channels
                return delays[(cursor-offset+delays.size)%delays.size]
            }
            var y = x + low[channel]*level("bass")*.8 + (x-low[channel])*level("treble")*.6
            y += (tanh(x*1.8)/1.8-x)*level("warmth")
            y += delayed(.22)*level("echo")*.45 + (delayed(.071)+delayed(.113))*level("reverb")*.2
            delays[cursor] = x
            cursor = (cursor+1)%delays.size
            val time = offset + samples.toDouble()/channels/inputAudioFormat.sampleRate
            val envelope = min(if(fadeIn > 0) (time/fadeIn).coerceIn(0.0,1.0) else 1.0,
                if(fadeOut > 0) ((duration-time)/fadeOut).coerceIn(0.0,1.0) else 1.0)
            samples++
            y = (y*gain*envelope).coerceIn(-1.0,1.0)
            if (floating) output.putFloat(y.toFloat()) else output.putShort((y*32767).roundToInt().toShort())
        }
        output.flip()
    }
    override fun onFlush() { delays.fill(0.0); low.fill(0.0); cursor = 0; samples = 0 }
}

object VideoLook {
    fun matrix(name: String): FloatArray {
        val p = when(name) {
            "original" -> doubleArrayOf(0.0,1.0,1.0,0.0)
            "vivid" -> doubleArrayOf(.03,1.12,1.45,0.0)
            "vivid-warm" -> doubleArrayOf(.03,1.1,1.3,.3)
            "vivid-cool" -> doubleArrayOf(.02,1.1,1.3,-.3)
            "dramatic" -> doubleArrayOf(-.04,1.4,.8,0.0)
            "mono" -> doubleArrayOf(0.0,1.15,0.0,0.0)
            else -> error("Unsupported video filter.")
        }
        val m = FloatArray(16); m[15] = 1f
        val luma = doubleArrayOf(.2126,.7152,.0722)
        for (row in 0..2) {
            val tint = if(row==0) 1+p[3]*.15 else if(row==2) 1-p[3]*.15 else 1.0
            for(col in 0..2) m[col*4+row] = ((luma[col]*(1-p[2]) + if(row==col) p[2] else 0.0)*p[1]*tint).toFloat()
            m[12+row] = ((.5*(1-p[1])+p[0])*tint).toFloat()
        }
        return m
    }
}
