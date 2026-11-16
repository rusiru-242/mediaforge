package com.mediaforge.app

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Streams decoded PCM into RIFF/WAVE; never loads the clip into memory. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
object WavExporter {
    fun export(input: File, output: File, ranges: List<Pair<Double,Double>>, gain: Double,
               effects: Map<*,*>, fadeIn: Double, fadeOut: Double,
               active: () -> Boolean, progress: (Double) -> Unit) {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            extractor.setDataSource(input.path)
            val track = (0 until extractor.trackCount).firstOrNull {
                extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
            } ?: error("No audio stream found.")
            extractor.selectTrack(track)
            val source = extractor.getTrackFormat(track)
            source.setInteger(MediaFormat.KEY_PCM_ENCODING, android.media.AudioFormat.ENCODING_PCM_16BIT)
            val decoder = MediaCodec.createDecoderByType(source.getString(MediaFormat.KEY_MIME)!!)
            codec = decoder
            decoder.configure(source, null, null, 0); decoder.start()
            extractor.seekTo((ranges.first().first*1e6).toLong(), MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
            val duration = ranges.sumOf { it.second-it.first }
            val processor = ClipAudioProcessor(gain, effects, fadeIn, fadeOut, duration)
            var sampleRate = 0; var channels = 0; var written = 0L
            var inputEnded = false; var outputEnded = false
            var idleSince = System.nanoTime()
            val info = MediaCodec.BufferInfo()
            RandomAccessFile(output, "rw").use { file ->
                file.setLength(0); file.write(ByteArray(44))
                while (!outputEnded && active()) {
                    require((System.nanoTime()-idleSince)/1e9 < 30) { "Audio decoder stalled." }
                    if (!inputEnded) {
                        val index = decoder.dequeueInputBuffer(10000)
                        if (index >= 0) {
                            val buffer = decoder.getInputBuffer(index)!!
                            val pts = extractor.sampleTime
                            val size = if(pts < 0 || pts >= ranges.last().second*1e6) -1 else extractor.readSampleData(buffer,0)
                            if(size < 0) {
                                decoder.queueInputBuffer(index,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM); inputEnded = true
                            } else {
                                decoder.queueInputBuffer(index,0,size,pts,0); extractor.advance()
                            }
                        }
                    }
                    val index = decoder.dequeueOutputBuffer(info,10000)
                    if(index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        val format = decoder.outputFormat
                        sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                        channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                        require(!format.containsKey(MediaFormat.KEY_PCM_ENCODING) || format.getInteger(MediaFormat.KEY_PCM_ENCODING) == android.media.AudioFormat.ENCODING_PCM_16BIT) { "WAV requires 16-bit PCM from this decoder." }
                        processor.configure(AudioProcessor.AudioFormat(sampleRate,channels,C.ENCODING_PCM_16BIT)); processor.flush()
                        idleSince = System.nanoTime()
                    } else if(index >= 0) {
                        try {
                            if(info.size > 0 && info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0) {
                                require(sampleRate > 0 && channels in 1..8)
                                val buffer = decoder.getOutputBuffer(index)!!
                                buffer.position(info.offset); buffer.limit(info.offset+info.size)
                                val kept = ByteBuffer.allocateDirect(info.size).order(ByteOrder.nativeOrder())
                                val frameBytes = channels*2
                                var frame = 0
                                while(buffer.remaining() >= frameBytes) {
                                    val t = info.presentationTimeUs/1e6 + frame.toDouble()/sampleRate
                                    if(ranges.any { t >= it.first && t < it.second }) {
                                        repeat(frameBytes) { kept.put(buffer.get()) }
                                    } else buffer.position(buffer.position()+frameBytes)
                                    frame++
                                }
                                kept.flip(); processor.queueInput(kept)
                                val processed = processor.output
                                val bytes = ByteArray(processed.remaining()); processed.get(bytes)
                                written += bytes.size
                                require(written < 0xFFFFFFFFL-36) { "WAV exceeds the RIFF size limit." }
                                file.write(bytes)
                                progress(((info.presentationTimeUs/1e6-ranges.first().first)/(ranges.last().second-ranges.first().first)).coerceIn(0.0,.99))
                            }
                            outputEnded = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
                        } finally { decoder.releaseOutputBuffer(index,false) }
                        idleSince = System.nanoTime()
                    }
                }
                require(active()) { "Audio export cancelled." }
                require(written > 0 && sampleRate > 0) { "Audio decoder returned no PCM samples." }
                val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
                header.put("RIFF".toByteArray()).putInt((written+36).toInt()).put("WAVEfmt ".toByteArray())
                    .putInt(16).putShort(1.toShort()).putShort(channels.toShort()).putInt(sampleRate)
                    .putInt(sampleRate*channels*2).putShort((channels*2).toShort()).putShort(16.toShort())
                    .put("data".toByteArray()).putInt(written.toInt())
                file.seek(0); file.write(header.array())
                processor.reset()
            }
        } finally {
            try { codec?.stop() } catch (_: Exception) {}
            codec?.release(); extractor.release()
            if(!active()) output.delete()
        }
    }
}
