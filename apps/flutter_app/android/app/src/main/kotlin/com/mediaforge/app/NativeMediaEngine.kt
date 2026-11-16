package com.mediaforge.app

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.MediaCodecList
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.exifinterface.media.ExifInterface
import androidx.media3.common.C
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.effect.Crop
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbMatrix
import androidx.media3.transformer.*
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.*

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class NativeMediaEngine(private val activity: Activity, messenger: BinaryMessenger) : MethodChannel.MethodCallHandler {
    private val channel = MethodChannel(messenger, "mediaforge/media")
    private val handler = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()
    private val root = File(activity.cacheDir, "mediaforge-jobs").apply { mkdirs() }
    private data class Job(val id: String, val file: File, val request: Map<String, Any?>) {
        @Volatile var state = "processing"
        @Volatile var progress: Double? = null
        var error: String? = null
        var transformer: Transformer? = null
        @Volatile var containerSession: Long? = null
        @Volatile var packaging = false
        val intermediate = File(file.parentFile, "$id.intermediate.mp4")
        val audioIntermediate = File(file.parentFile, "$id.intermediate.wav")
        val imageIntermediate = File(file.parentFile, "$id.intermediate.png")
        val started = Instant.now().toString()
        var completed: String? = null
    }
    private val jobs = mutableMapOf<String, Job>()
    private var pendingSave: Pair<File, MethodChannel.Result>? = null
    init { channel.setMethodCallHandler(this); cleanup() }

    private fun codecs(mime: String) = MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos.any {
        it.isEncoder && it.supportedTypes.any { type -> type.equals(mime, true) }
    }
    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        val a = (call.arguments as? Map<*, *>)?.entries?.associate { it.key.toString() to it.value } ?: emptyMap()
        try {
            when (call.method) {
                "capabilities" -> result.success(mapOf("video" to if (codecs(MimeTypes.VIDEO_H264)) listOf("mp4", "webm", "mov", "mkv", "avi") else emptyList<String>(),
                    "audio" to listOf("mp3", "wav", "aac", "flac", "ogg") + if (codecs(MimeTypes.AUDIO_AAC)) listOf("m4a") else emptyList<String>(),
                    "image" to listOf("jpg", "png", "webp", "avif"), "cropVideo" to true, "cut" to true,
                    "imageRotation" to true, "imageEditing" to true, "videoFilters" to true, "audioEffects" to true, "audioFades" to true, "encoderTuning" to true, "maxHeight" to (MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos
                        .filter { it.isEncoder && it.supportedTypes.contains(MimeTypes.VIDEO_H264) }
                        .mapNotNull { try { it.getCapabilitiesForType(MimeTypes.VIDEO_H264).videoCapabilities?.supportedHeights?.upper } catch (_: Exception) { null } }
                        .maxOrNull()?.coerceAtMost(2160) ?: 0)))
                "outputDirectory" -> result.success(root.path)
                "probe" -> background(result) { probe(checkedInput(a["path"] as String)) }
                "submit" -> submit(a, result)
                "status" -> {
                    val job = jobs[a["id"]] ?: error("This local job no longer exists.")
                    if (job.state == "processing" && !job.packaging) {
                        val progress = ProgressHolder()
                        if (job.transformer?.getProgress(progress) == Transformer.PROGRESS_STATE_AVAILABLE) job.progress = progress.progress / 100.0 * (if (job.file.extension != "mp4" && job.request["kind"] == "video") .8 else 1.0)
                    }
                    result.success(mapOf("id" to job.id, "state" to job.state, "progress" to job.progress,
                        "operation" to if (job.packaging) "Packaging ${job.file.extension.uppercase()} locally" else if (job.state == "processing") "Processing locally" else job.state,
                        "output" to if (job.state == "completed") job.file.path else null, "error" to job.error,
                        "started" to job.started, "completed" to job.completed))
                }
                "cancel" -> { jobs[a["id"]]?.let { cancel(it, null) }; result.success(null) }
                "cancelAll" -> { cancelAll(); result.success(null) }
                "cleanup" -> { cleanup(); result.success(null) }
                "save" -> save(a["path"] as String, result)
                "saveGallery" -> gallery(a["path"] as String, result)
                else -> result.notImplemented()
            }
        } catch (e: Exception) { result.error("MEDIA_ERROR", e.message ?: "Media operation failed.", null) }
    }
    private fun background(result: MethodChannel.Result, action: () -> Any?) {
        worker.execute { try { val value = action(); handler.post { result.success(value) } }
            catch (e: Exception) { handler.post { result.error("MEDIA_ERROR", e.message ?: "Media operation failed.", null) } } }
    }
    private fun checkedInput(path: String): File {
        require(!path.contains("://")) { "Import the document to local storage first." }
        return File(path).canonicalFile.also { require(it.isFile && it.length() in 1..(2L * 1024 * 1024 * 1024)) { "Choose a valid local file under 2 GiB." } }
    }
    private fun probe(file: File): Map<String, Any> {
        if (file.extension.equals("avif", true)) return MobileContainers.probeAvif(file)
        val bounds = BitmapFactory.Options().also { it.inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.path, bounds)
        if (bounds.outWidth > 0) {
            val orientation = try { ExifInterface(file).rotationDegrees } catch (_: Exception) { 0 }
            return mapOf("path" to file.path, "width" to if (orientation % 180 == 90) bounds.outHeight else bounds.outWidth,
                "height" to if (orientation % 180 == 90) bounds.outWidth else bounds.outHeight,
                "bytes" to file.length(), "video" to false, "audio" to false, "duration" to 0.0)
        }
        return MobileContainers.probe(file)
    }
    private fun number(a: Map<String, Any?>, name: String, fallback: Double) = (a[name] as? Number)?.toDouble() ?: fallback
    private fun submit(a: Map<String, Any?>, result: MethodChannel.Result) {
        require(jobs.values.none { it.state == "processing" }) { "Another local job is still processing." }
        val input = checkedInput(a["input"] as String)
        val kind = a["kind"] as String; val format = a["format"] as String
        require(when(kind) { "video" -> format in listOf("mp4", "webm", "mov", "mkv", "avi"); "audio" -> format in listOf("mp3", "wav", "aac", "flac", "ogg", "m4a"); "image" -> format in listOf("jpg", "png", "webp", "avif"); else -> false }) { "Unsupported output format on this device." }
        val id = UUID.randomUUID().toString(); val job = Job(id, File(root, "$id.$format"), a)
        jobs[id] = job
        result.success(mapOf("id" to id))
        worker.execute {
            try {
                val metadata = probe(input)
                if (kind == "image") image(input, job) else if (kind == "audio" && format != "m4a") {
                    val ranges = keptRanges(a, metadata["duration"] as Double)
                    WavExporter.export(input,if (format == "wav") job.file else job.audioIntermediate,ranges,number(a,"volume",1.0),
                        a["audioEffects"] as? Map<*,*> ?: emptyMap<Any,Any>(),
                        number(a,"fadeIn",0.0),number(a,"fadeOut",0.0),
                        { job.state == "processing" }, { job.progress = it * (if (format == "wav") 1.0 else .8) })
                    if (format != "wav") {
                        job.packaging = true
                        MobileContainers.export(job.audioIntermediate, job.file,
                            ranges.sumOf { it.second-it.first }, 0, number(a,"audioBitrate",192.0).toInt(),
                            { job.state == "processing" }, { job.containerSession = it },
                            { job.progress = .8 + .19 * it }, true)
                    }
                    val output = probe(job.file)
                    require(output["audio"] == true && output["video"] == false) { "Audio output verification failed." }
                    val expected = ranges.sumOf { it.second-it.first }
                    require(abs((output["duration"] as Double)-expected) <= max(if (format in listOf("wav", "flac")) .1 else .3,expected*.03)) { "Audio duration verification failed." }
                    handler.post { finish(job) }
                } else handler.post {
                    try { if (job.state == "processing") transform(input, job, metadata) }
                    catch (e: Exception) { fail(job, e.message ?: "The device could not process this media.") }
                }
            } catch (e: Exception) { handler.post { fail(job, e.message ?: "The media could not be read.") } }
        }
        handler.postDelayed({ if (job.state == "processing") cancel(job, "Processing exceeded 30 minutes.") }, 30 * 60 * 1000L)
    }
    private fun keptRanges(a: Map<String, Any?>, duration: Double): List<Pair<Double, Double>> {
        val start = number(a, "start", 0.0); val end = number(a, "end", duration)
        require(start >= 0 && end <= duration + .1 && end > start) { "Trim range is outside this clip." }
        var cursor = start; val ranges = mutableListOf<Pair<Double, Double>>()
        val cuts = (a["cuts"] as? List<*>)?.map { it as Map<*, *> }?.sortedBy { (it["start"] as Number).toDouble() } ?: emptyList()
        require(cuts.size <= 20)
        for (cut in cuts) {
            val from = (cut["start"] as Number).toDouble(); val to = (cut["end"] as Number).toDouble()
            require(from >= start && to > from && to <= end) { "Invalid cut range." }
            if (from > cursor) ranges.add(cursor to from)
            cursor = max(cursor, to)
        }
        if (cursor < end) ranges.add(cursor to end)
        require(ranges.isNotEmpty()) { "Cuts removed the entire clip." }
        return ranges
    }
    private fun transform(input: File, job: Job, info: Map<String, Any>) {
        val a = job.request; val video = a["kind"] == "video"
        require(if(video) info["video"] == true else info["audio"] == true) { "The input has no requested media track." }
        val ranges = keptRanges(a, info["duration"] as Double)
        val effects = mutableListOf<Effect>()
        val filter = a["videoFilter"] as? String ?: "original"
        if (video && filter != "original") effects.add(object : RgbMatrix {
            override fun getMatrix(presentationTimeUs: Long, useHdr: Boolean): FloatArray = VideoLook.matrix(filter)
        })
        (a["crop"] as? Map<*, *>)?.let {
            val x = (it["x"] as Number).toFloat(); val y = (it["y"] as Number).toFloat()
            val w = (it["width"] as Number).toFloat(); val h = (it["height"] as Number).toFloat()
            require(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= 1.00001 && y+h <= 1.00001)
            effects.add(Crop(2*x-1, 2*(x+w)-1, 1-2*(y+h), 1-2*y))
        }
        val height = (a["height"] as? Number)?.toInt()
        if (height != null) { require(height in 144..2160 && height % 2 == 0); effects.add(Presentation.createForHeight(height)) }
        val audioLevels = a["audioEffects"] as? Map<*, *> ?: emptyMap<Any,Any>()
        val gain = number(a,"volume",1.0)
        val fadeIn = number(a,"fadeIn",0.0); val fadeOut = number(a,"fadeOut",0.0)
        require(fadeIn.isFinite() && fadeOut.isFinite() && fadeIn in 0.0..3600.0 && fadeOut in 0.0..3600.0)
        val totalDuration = ranges.sumOf { it.second-it.first }
        var audioOffset = 0.0
        val processAudio = fadeIn > 0 || fadeOut > 0 || gain != 1.0 || audioLevels.values.any { ((it as? Number)?.toDouble() ?: 0.0) != 0.0 }
        val edited = ranges.map { (from, to) ->
            val item = MediaItem.Builder().setUri(Uri.fromFile(input)).setClippingConfiguration(MediaItem.ClippingConfiguration.Builder()
                .setStartPositionMs((from*1000).roundToLong()).setEndPositionMs((to*1000).roundToLong()).build()).build()
            val offset = audioOffset; audioOffset += to-from
            EditedMediaItem.Builder(item).setRemoveVideo(!video).setRemoveAudio(video && a["mute"] == true)
                .setEffects(Effects(if(processAudio) listOf(ClipAudioProcessor(gain, audioLevels, fadeIn, fadeOut, totalDuration, offset)) else emptyList(), if(video) effects else emptyList())).build()
        }
        val tracks = mutableSetOf<Int>()
        if (video) tracks.add(C.TRACK_TYPE_VIDEO)
        if (info["audio"] == true && (!video || a["mute"] != true)) tracks.add(C.TRACK_TYPE_AUDIO)
        val sequence = EditedMediaItemSequence.Builder(tracks).addItems(edited).build()
        val encoderBuilder = DefaultEncoderFactory.Builder(activity).setEnableFallback(false)
            .setRequestedAudioEncoderSettings(AudioEncoderSettings.Builder().setBitrate(number(a,"audioBitrate",192.0).toInt()*1000).build())
        (a["videoBitrate"] as? Number)?.let { require(it.toInt() in 100..50000); encoderBuilder.setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(it.toInt()*1000).build()) }
        val encoder = encoderBuilder.build()
        val builder = Transformer.Builder(activity).setAudioMimeType(MimeTypes.AUDIO_AAC).setEncoderFactory(encoder)
            .addListener(object: Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    worker.execute {
                        try {
                            if (job.state != "processing") { job.intermediate.delete(); job.audioIntermediate.delete(); job.imageIntermediate.delete(); return@execute }
                            if (video && job.file.extension != "mp4") {
                                job.packaging = true
                                job.progress = .8
                                MobileContainers.export(job.intermediate, job.file,
                                    ranges.sumOf { it.second-it.first },
                                    number(a, "videoBitrate", 8000.0).toInt(),
                                    number(a, "audioBitrate", 192.0).toInt(),
                                    { job.state == "processing" },
                                    { job.containerSession = it },
                                    { job.progress = .8 + .19 * it })
                            }
                            val output = probe(job.file)
                            require(job.file.length() > 0 && if(video) output["video"] == true else output["audio"] == true && output["video"] == false) { "The output contains the wrong media tracks." }
                            if (tracks.contains(C.TRACK_TYPE_AUDIO)) require(output["audio"] == true) { "Expected audio is missing." }
                            if (video && height != null) require(output["height"] == height) { "The device did not produce the requested resolution." }
                            val expected = ranges.sumOf { it.second-it.first }
                            require(abs((output["duration"] as Double)-expected) <= max(.5,expected*.03)) { "Output duration verification failed." }
                            handler.post { finish(job) }
                        } catch (e: Exception) { handler.post { fail(job, e.message ?: "Output verification failed.") } }
                    }
                }
                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                    fail(job, "This device could not export the selected format/resolution (${exportException.errorCodeName}).")
                }
            })
        if (video) builder.setVideoMimeType(MimeTypes.VIDEO_H264)
        job.transformer = builder.build()
        job.transformer!!.start(Composition.Builder(sequence).build(),
            (if (video && job.file.extension != "mp4") job.intermediate else job.file).path)
    }
    private fun image(input: File, job: Job) {
        val bounds = BitmapFactory.Options().also { it.inJustDecodeBounds = true }; BitmapFactory.decodeFile(input.path, bounds)
        require(bounds.outWidth > 0 && bounds.outWidth.toLong()*bounds.outHeight <= 16_000_000) { "Image exceeds the 16 megapixel mobile processing limit." }
        var bitmap = BitmapFactory.decodeFile(input.path) ?: error("Unsupported image.")
        fun replace(next: Bitmap) { if (next !== bitmap) { bitmap.recycle(); bitmap = next } }
        try {
            val exif = ExifInterface(input)
            val orientation = Matrix().apply {
                if (exif.isFlipped) postScale(-1f, 1f)
                postRotate(exif.rotationDegrees.toFloat())
            }
            replace(Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, orientation, true))
            (job.request["crop"] as? Map<*, *>)?.let {
                val x = ((it["x"] as Number).toDouble()*bitmap.width).roundToInt(); val y = ((it["y"] as Number).toDouble()*bitmap.height).roundToInt()
                val w = ((it["width"] as Number).toDouble()*bitmap.width).roundToInt(); val h = ((it["height"] as Number).toDouble()*bitmap.height).roundToInt()
                require(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= bitmap.width && y+h <= bitmap.height)
                replace(Bitmap.createBitmap(bitmap,x,y,w,h))
            }
            val rotation = number(job.request,"rotation",0.0).toInt(); require(rotation in listOf(0,90,180,270))
            if (rotation != 0) replace(Bitmap.createBitmap(bitmap,0,0,bitmap.width,bitmap.height,Matrix().apply { postRotate(rotation.toFloat()) },true))
            if (job.request["flipHorizontal"] == true || job.request["flipVertical"] == true) {
                replace(Bitmap.createBitmap(bitmap,0,0,bitmap.width,bitmap.height,Matrix().apply {
                    postScale(if(job.request["flipHorizontal"] == true) -1f else 1f, if(job.request["flipVertical"] == true) -1f else 1f)
                },true))
            }
            val scale = number(job.request,"imageScale",1.0)
            require(scale.isFinite() && scale in .1..1.0)
            if(scale != 1.0) replace(Bitmap.createScaledBitmap(bitmap,max(1,(bitmap.width*scale).roundToInt()),max(1,(bitmap.height*scale).roundToInt()),true))
            (job.request["imageAdjustments"] as? Map<*,*>)?.takeIf { it.isNotEmpty() }?.let {
                replace(ImageLook.apply(bitmap,it))
            }
            (job.request["height"] as? Number)?.let { val h = it.toInt(); require(h in 2..4096)
                replace(Bitmap.createScaledBitmap(bitmap,max(1,(bitmap.width.toDouble()*h/bitmap.height).roundToInt()),h,true)) }
            if (job.state != "processing") return
            if (job.request["format"] == "avif") {
                job.progress = null
                job.packaging = true
                job.imageIntermediate.outputStream().use { require(bitmap.compress(Bitmap.CompressFormat.PNG,100,it)) }
                MobileContainers.exportAvif(job.imageIntermediate, job.file,
                    number(job.request,"quality",85.0).toInt(), bitmap.hasAlpha(),
                    { job.state == "processing" }, { job.containerSession = it })
                val verified = MobileContainers.probeAvif(job.file)
                require(verified["width"] == bitmap.width && verified["height"] == bitmap.height) { "AVIF dimensions do not match the requested image." }
                handler.post { finish(job) }
                return
            }
            val format = when(job.request["format"]) { "jpg" -> Bitmap.CompressFormat.JPEG; "png" -> Bitmap.CompressFormat.PNG; else -> if(Build.VERSION.SDK_INT >= 30) Bitmap.CompressFormat.WEBP_LOSSY else @Suppress("DEPRECATION") Bitmap.CompressFormat.WEBP }
            job.file.outputStream().use { require(bitmap.compress(format,number(job.request,"quality",85.0).toInt().coerceIn(1,100),it)) }
            val verified = probe(job.file); require((verified["width"] as Int) > 0 && job.file.length() > 0)
            handler.post { finish(job) }
        } finally { bitmap.recycle(); if (job.state == "cancelled") job.file.delete() }
    }
    private fun finish(job: Job) {
        if (job.state != "processing") { job.file.delete(); return }
        job.intermediate.delete(); job.audioIntermediate.delete(); job.imageIntermediate.delete(); job.packaging = false
        job.state = "completed"; job.completed = Instant.now().toString(); job.progress = 1.0; job.transformer = null
    }
    private fun fail(job: Job, message: String) {
        if (job.state != "processing") return
        job.state = "failed"; job.error = message; job.completed = Instant.now().toString(); job.file.delete(); job.intermediate.delete(); job.audioIntermediate.delete(); job.imageIntermediate.delete(); job.packaging = false; job.transformer = null
    }
    private fun cancel(job: Job, reason: String?) {
        if (job.state != "processing") return
        job.state = "cancelled"; job.error = reason; job.completed = Instant.now().toString()
        job.transformer?.cancel(); job.transformer = null
        job.containerSession?.let { com.arthenica.ffmpegkit.FFmpegKit.cancel(it) }
        job.file.delete(); job.intermediate.delete(); job.audioIntermediate.delete(); job.imageIntermediate.delete()
    }
    fun cancelAll(reason: String? = null) { jobs.values.forEach { cancel(it, reason) } }
    private fun cleanup() { root.listFiles()?.filter { it.isFile && System.currentTimeMillis()-it.lastModified() > 86400000 }?.forEach { it.delete() } }
    private fun output(path: String): File = checkedInput(path).also { require(it.parentFile == root.canonicalFile) { "Only verified app outputs can be exported." } }
    private fun save(path: String, result: MethodChannel.Result) {
        require(pendingSave == null) { "A save dialog is already open." }
        val file = output(path); pendingSave = file to result
        activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply { type = mime(file); addCategory(Intent.CATEGORY_OPENABLE); putExtra(Intent.EXTRA_TITLE, if (file.nameWithoutExtension.matches(Regex("[0-9a-fA-F-]{36}"))) "MediaForge_${file.name}" else file.name) }, 7451)
    }
    fun activityResult(requestCode: Int, resultCode: Int, intent: Intent?): Boolean {
        if (requestCode != 7451) return false
        val pending = pendingSave; pendingSave = null
        if (pending == null) return true
        val uri = intent?.data
        if (resultCode != Activity.RESULT_OK || uri == null) { pending.second.success(null); return true }
        background(pending.second) { try { activity.contentResolver.openOutputStream(uri,"w").use { out -> require(out != null); pending.first.inputStream().use { it.copyTo(out,64*1024) } }; uri.toString() }
            catch(e: Exception) { try { activity.contentResolver.delete(uri,null,null) } catch(_: Exception) {}; throw e } }
        return true
    }
    private fun mime(file: File) = when(file.extension) { "mp4" -> "video/mp4"; "webm" -> "video/webm"; "mkv" -> "video/x-matroska"; "mov" -> "video/quicktime"; "avi" -> "video/x-msvideo"; "flv" -> "video/x-flv"; "mp3" -> "audio/mpeg"; "aac" -> "audio/aac"; "flac" -> "audio/flac"; "ogg" -> "audio/ogg"; "m4a" -> "audio/mp4"; "wav" -> "audio/wav"; "zip" -> "application/zip"; "avif" -> "image/avif"; "png" -> "image/png"; "webp" -> "image/webp"; else -> "image/jpeg" }
    private fun gallery(path: String, result: MethodChannel.Result) {
        require(Build.VERSION.SDK_INT >= 29) { "Use Save to Files on Android 9 or earlier." }
        val file = output(path)
        background(result) {
            val collection = when(file.extension) { "mp4" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI; "mp3", "m4a", "wav", "aac", "flac", "ogg" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI; else -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI }
            val values = ContentValues().apply { put(MediaStore.MediaColumns.DISPLAY_NAME,"MediaForge_${file.name}"); put(MediaStore.MediaColumns.MIME_TYPE,mime(file)); put(MediaStore.MediaColumns.IS_PENDING,1) }
            val uri = activity.contentResolver.insert(collection,values) ?: error("Could not create a gallery item.")
            try {
                activity.contentResolver.openOutputStream(uri).use { out -> require(out != null); file.inputStream().use { it.copyTo(out,64*1024) } }
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING,0); activity.contentResolver.update(uri,values,null,null); uri.toString()
            } catch(e: Exception) { activity.contentResolver.delete(uri,null,null); throw e }
        }
    }
    fun dispose() { cancelAll(); pendingSave?.second?.success(null); pendingSave = null; channel.setMethodCallHandler(null); worker.shutdown() }
}
