package com.mediaforge.app

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFprobeKit
import com.arthenica.ffmpegkit.ReturnCode
import org.json.JSONObject
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Runs only on the native worker; arguments never pass through a shell. */
object MobileContainers {
    fun probeAvif(file: File): Map<String, Any> {
        val session = FFprobeKit.executeWithArguments(arrayOf("-v", "error", "-show_format", "-show_streams", "-of", "json", file.path))
        require(ReturnCode.isSuccess(session.returnCode)) { "Cannot read AVIF image." }
        val json = JSONObject(session.output)
        val stream = json.getJSONArray("streams").getJSONObject(0)
        require(stream.optString("codec_name") == "av1") { "AVIF does not contain AV1 image data." }
        val tags = json.getJSONObject("format").optJSONObject("tags")
        require(tags?.optString("major_brand") == "avif" || tags?.optString("compatible_brands")?.contains("avif") == true) {
            "Output is not an AVIF image container."
        }
        val width = stream.optInt("width"); val height = stream.optInt("height")
        require(width > 0 && height > 0 && file.length() > 0) { "AVIF image verification failed." }
        return mapOf("path" to file.path, "width" to width, "height" to height,
            "duration" to 0.0, "bytes" to file.length(), "video" to false,
            "audio" to false, "container" to "avif", "codec" to "av1",
            "alpha" to (json.getJSONArray("streams").length() > 1))
    }

    fun exportAvif(input: File, output: File, quality: Int, alpha: Boolean,
                   active: () -> Boolean, sessionStarted: (Long) -> Unit) {
        require(active()) { "Export cancelled." }
        val args = mutableListOf("-nostdin", "-y", "-v", "error", "-i", input.path, "-map", "0:v:0")
        if (alpha) args.addAll(listOf("-map", "0:v:0", "-filter:v:1", "alphaextract", "-pix_fmt:v:1", "gray"))
        args.addAll(listOf("-pix_fmt:v:0", "yuv444p", "-c:v", "libaom-av1", "-still-picture", "1",
            "-cpu-used", "6", "-threads", "2", "-crf", "${((100-quality.coerceIn(1,100))*63/100)}",
            "-frames:v:0", "1"))
        if (alpha) args.addAll(listOf("-frames:v:1", "1", "-crf:v:1", "0"))
        args.addAll(listOf("-f", "avif", output.path))
        val done = CountDownLatch(1)
        val session = FFmpegKit.executeWithArgumentsAsync(args.toTypedArray(), { done.countDown() })
        sessionStarted(session.sessionId)
        if (!active()) FFmpegKit.cancel(session.sessionId)
        try {
            if (!done.await(10, TimeUnit.MINUTES)) {
                FFmpegKit.cancel(session.sessionId)
                done.await(10, TimeUnit.SECONDS)
                error("AVIF encoding timed out.")
            }
            require(active()) { "Export cancelled." }
            require(ReturnCode.isSuccess(session.returnCode)) { "Could not encode AVIF image." }
            val info = probeAvif(output)
            if (alpha) require(info["alpha"] == true) { "AVIF transparency is missing." }
        } catch (e: Exception) {
            FFmpegKit.cancel(session.sessionId)
            output.delete()
            throw e
        } finally {
            input.delete()
            if (!active()) output.delete()
        }
    }

    fun probe(file: File): Map<String, Any> {
        val session = FFprobeKit.executeWithArguments(arrayOf("-v", "error", "-show_format", "-show_streams", "-of", "json", file.path))
        require(ReturnCode.isSuccess(session.returnCode)) { "Cannot read this media file." }
        val json = JSONObject(session.output)
        val streams = json.optJSONArray("streams") ?: error("No media streams found.")
        var video = false; var audio = false; var width = 0; var height = 0
        for (i in 0 until streams.length()) {
            val stream = streams.getJSONObject(i)
            if (stream.optString("codec_type") == "video" && stream.optJSONObject("disposition")?.optInt("attached_pic") != 1) {
                video = true; width = stream.optInt("width"); height = stream.optInt("height")
                var rotation = stream.optJSONObject("tags")?.optInt("rotate") ?: 0
                val side = stream.optJSONArray("side_data_list")
                if (side != null) for (j in 0 until side.length()) {
                    val data = side.getJSONObject(j)
                    if (data.has("rotation")) rotation = data.optInt("rotation")
                }
                if (kotlin.math.abs(rotation) % 180 == 90) { val w = width; width = height; height = w }
            }
            if (stream.optString("codec_type") == "audio") audio = true
        }
        require(video || audio) { "No supported media tracks found." }
        val info = json.optJSONObject("format") ?: error("Missing media container information.")
        val duration = info.optString("duration").toDoubleOrNull() ?: 0.0
        require(duration.isFinite() && duration > 0) { "Media duration is invalid." }
        return mapOf("path" to file.path, "width" to width, "height" to height,
            "duration" to duration, "bytes" to file.length(), "video" to video,
            "audio" to audio, "container" to info.optString("format_name"))
    }

    fun export(input: File, output: File, duration: Double, bitrate: Int, audioBitrate: Int,
               active: () -> Boolean, sessionStarted: (Long) -> Unit, progress: (Double) -> Unit, audioOnly: Boolean = false) {
        require(active()) { "Export cancelled." }
        val format = output.extension
        val args = mutableListOf("-nostdin", "-y", "-v", "error", "-i", input.path,
            "-map_metadata", "-1", "-threads", "2")
        if (audioOnly) args.addAll(listOf("-map", "0:a:0", "-vn"))
        else args.addAll(listOf("-map", "0:v:0", "-map", "0:a:0?"))
        when (format) {
            "mp3" -> args.addAll(listOf("-c:a", "libmp3lame", "-b:a", "${audioBitrate.coerceIn(32, 320)}k", "-f", "mp3"))
            "aac" -> args.addAll(listOf("-c:a", "aac", "-b:a", "${audioBitrate.coerceIn(32, 320)}k", "-f", "adts"))
            "flac" -> args.addAll(listOf("-c:a", "flac", "-compression_level", "5", "-f", "flac"))
            "ogg" -> args.addAll(listOf("-c:a", "libvorbis", "-b:a", "${audioBitrate.coerceIn(32, 320)}k", "-f", "ogg"))
            "mov" -> args.addAll(listOf("-c", "copy", "-movflags", "+faststart", "-f", "mov"))
            "mkv" -> args.addAll(listOf("-c", "copy", "-f", "matroska"))
            "webm" -> args.addAll(listOf("-c:v", "libvpx-vp9", "-deadline", "realtime",
                "-cpu-used", "6", "-b:v", "${bitrate.coerceIn(100, 50000)}k",
                "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "${audioBitrate.coerceIn(32, 320)}k", "-f", "webm"))
            "avi" -> args.addAll(listOf("-c:v", "mpeg4", "-b:v", "${bitrate.coerceIn(100, 50000)}k",
                "-pix_fmt", "yuv420p", "-c:a", "libmp3lame", "-b:a", "${audioBitrate.coerceIn(32, 320)}k", "-f", "avi"))
            else -> error("Unsupported media container.")
        }
        args.add(output.path)
        val completed = CountDownLatch(1)
        val session = FFmpegKit.executeWithArgumentsAsync(args.toTypedArray(),
            { completed.countDown() }, {}, { stats ->
                progress((stats.time / (duration * 1000)).coerceIn(0.0, 1.0))
            })
        sessionStarted(session.sessionId)
        if (!active()) FFmpegKit.cancel(session.sessionId)
        try {
            if (!completed.await(30, TimeUnit.MINUTES)) {
                FFmpegKit.cancel(session.sessionId)
                completed.await(10, TimeUnit.SECONDS)
                error("Media packaging timed out.")
            }
            require(active()) { "Export cancelled." }
            require(ReturnCode.isSuccess(session.returnCode)) { "Could not create ${format.uppercase()} video." }
            val info = probe(output)
            val container = info["container"] as String
            require(when (format) {
                "mp3" -> container == "mp3"
                "aac" -> container == "aac"
                "flac" -> container == "flac"
                "ogg" -> container == "ogg"
                "webm" -> container.contains("webm")
                "mkv" -> container.contains("matroska")
                "mov" -> container.contains("mov")
                "avi" -> container == "avi"
                else -> false
            }) { "The output container does not match the selected format." }
            require(output.length() > 0 && if (audioOnly) info["audio"] == true && info["video"] == false else info["video"] == true) { "Media output verification failed." }
        } catch (e: Exception) {
            FFmpegKit.cancel(session.sessionId)
            output.delete()
            throw e
        } finally {
            input.delete()
            if (!active()) output.delete()
        }
    }
}
