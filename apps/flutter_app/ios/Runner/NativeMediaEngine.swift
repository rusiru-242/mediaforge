import Flutter
import UIKit
import AVFoundation
import CoreImage
import ImageIO
import UniformTypeIdentifiers
import Photos

/// Native iOS implementation. Must be compiled and device-tested on macOS.
final class NativeMediaEngine: NSObject, UIDocumentPickerDelegate {
    private let channel: FlutterMethodChannel
    private let worker = DispatchQueue(label: "mediaforge.processing", qos: .userInitiated)
    private let root: URL
    private var jobs: [String: Job] = [:]
    private var saveResult: FlutterResult?
    private var notification: NSObjectProtocol?
    private final class Job {
        let id: String, output: URL, request: [String: Any], started = ISO8601DateFormatter().string(from: Date())
        private let stateLock = NSLock()
        private var rawState = "processing"
        var state: String { get { stateLock.lock(); defer { stateLock.unlock() }; return rawState } set { stateLock.lock(); rawState = newValue; stateLock.unlock() } }
        var error: String?, completed: String?, session: AVAssetExportSession?
        init(_ id: String, _ output: URL, _ request: [String: Any]) { self.id = id; self.output = output; self.request = request }
    }
    init(messenger: FlutterBinaryMessenger) {
        channel = FlutterMethodChannel(name: "mediaforge/media", binaryMessenger: messenger)
        root = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("mediaforge-jobs", isDirectory: true)
        super.init()
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        channel.setMethodCallHandler { [weak self] call, result in self?.handle(call, result) }
        notification = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.cancelAll() }
        cleanup()
    }
    deinit { if let notification = notification { NotificationCenter.default.removeObserver(notification) } }
    private func failure(_ message: String) -> NSError { NSError(domain: "MediaForge", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    private func input(_ path: String) throws -> URL {
        guard !path.contains("://") else { throw failure("Import a local file first.") }
        let url = URL(fileURLWithPath: path).standardizedFileURL
        let values = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
        guard values.isRegularFile == true, let bytes = values.fileSize, bytes > 0, bytes <= 2 * 1024 * 1024 * 1024 else { throw failure("Choose a local file under 2 GiB.") }
        return url
    }
    private func number(_ a: [String: Any], _ key: String, _ fallback: Double) -> Double { (a[key] as? NSNumber)?.doubleValue ?? fallback }
    private func handle(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
        let a = call.arguments as? [String: Any] ?? [:]
        do {
            switch call.method {
            case "capabilities": result(["video": ["mp4", "mov"], "audio": ["m4a"], "image": ["jpg", "png"], "cropVideo": true, "cut": true, "imageRotation": true, "maxHeight": 2160])
            case "outputDirectory": result(root.path)
            case "probe":
                let url = try input(a["path"] as? String ?? "")
                background(result) { try self.probe(url) }
            case "submit": try submit(a, result)
            case "status":
                guard let id = a["id"] as? String, let job = jobs[id] else { throw failure("This local job no longer exists.") }
                var value: [String: Any] = ["id": id, "state": job.state, "started": job.started, "operation": job.state == "processing" ? "Processing locally" : job.state]
                if job.state == "completed" { value["output"] = job.output.path; value["progress"] = 1.0 }
                else if let session = job.session { value["progress"] = Double(session.progress) }
                if let error = job.error { value["error"] = error }; if let completed = job.completed { value["completed"] = completed }
                result(value)
            case "cancel": if let id = a["id"] as? String, let job = jobs[id] { cancel(job) }; result(nil)
            case "cancelAll": cancelAll(); result(nil)
            case "cleanup": cleanup(); result(nil)
            case "save": try save(a["path"] as? String ?? "", result)
            case "saveGallery": try gallery(a["path"] as? String ?? "", result)
            default: result(FlutterMethodNotImplemented)
            }
        } catch { result(FlutterError(code: "MEDIA_ERROR", message: error.localizedDescription, details: nil)) }
    }
    private func background(_ result: @escaping FlutterResult, _ action: @escaping () throws -> Any?) {
        worker.async { do { let value = try action(); DispatchQueue.main.async { result(value) } }
            catch { DispatchQueue.main.async { result(FlutterError(code: "MEDIA_ERROR", message: error.localizedDescription, details: nil)) } } }
    }
    private func probe(_ url: URL) throws -> [String: Any] {
        let bytes = (try url.resourceValues(forKeys: [.fileSizeKey])).fileSize ?? 0
        if let source = CGImageSourceCreateWithURL(url as CFURL, nil),
           let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
           let width = properties[kCGImagePropertyPixelWidth] as? Int, let height = properties[kCGImagePropertyPixelHeight] as? Int {
            let orientation = properties[kCGImagePropertyOrientation] as? Int ?? 1
            return ["path": url.path, "bytes": bytes, "width": orientation >= 5 ? height : width, "height": orientation >= 5 ? width : height, "duration": 0.0, "video": false, "audio": false]
        }
        let asset = AVURLAsset(url: url)
        guard !asset.hasProtectedContent else { throw failure("Protected media cannot be processed.") }
        let video = asset.tracks(withMediaType: .video).first
        let audio = !asset.tracks(withMediaType: .audio).isEmpty
        guard video != nil || audio else { throw failure("No supported media tracks were found.") }
        let size = video.map { $0.naturalSize.applying($0.preferredTransform) } ?? .zero
        let duration = CMTimeGetSeconds(asset.duration)
        guard duration.isFinite && duration > 0 else { throw failure("Invalid media duration.") }
        return ["path": url.path, "bytes": bytes, "width": Int(abs(size.width)), "height": Int(abs(size.height)), "duration": duration, "video": video != nil, "audio": audio]
    }
    private func submit(_ a: [String: Any], _ result: @escaping FlutterResult) throws {
        guard !jobs.values.contains(where: { $0.state == "processing" }) else { throw failure("Another local job is processing.") }
        let source = try input(a["input"] as? String ?? "")
        guard let kind = a["kind"] as? String, let format = a["format"] as? String,
              ["video": ["mp4", "mov"], "audio": ["m4a"], "image": ["jpg", "png"]][kind]?.contains(format) == true else { throw failure("Unsupported iOS output format.") }
        let id = UUID().uuidString.lowercased(), output = root.appendingPathComponent("\(UUID().uuidString).\(format)")
        let job = Job(id, output, a); jobs[id] = job; result(["id": id])
        worker.async {
            do {
                let metadata = try self.probe(source)
                if kind == "image" { try self.image(source, job); DispatchQueue.main.async { self.finish(job) } }
                else { try self.media(source, job, metadata) }
            } catch { DispatchQueue.main.async { self.fail(job, error.localizedDescription) } }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1800) { if job.state == "processing" { self.cancel(job) } }
    }
    private func ranges(_ a: [String: Any], _ duration: Double) throws -> [(Double, Double)] {
        let start = number(a,"start",0), end = number(a,"end",duration)
        guard start.isFinite && end.isFinite && start >= 0 && end > start && end <= duration + 0.1 else { throw failure("Trim range is outside the clip.") }
        let cuts = (a["cuts"] as? [[String: Any]] ?? []).sorted { number($0,"start",0) < number($1,"start",0) }
        guard cuts.count <= 20 else { throw failure("Too many cuts.") }
        var cursor = start, kept: [(Double, Double)] = []
        for cut in cuts { let from = number(cut,"start",0), to = number(cut,"end",0)
            guard from >= start && to > from && to <= end else { throw failure("Invalid cut range.") }
            if from > cursor { kept.append((cursor,from)) }; cursor = max(cursor,to)
        }
        if cursor < end { kept.append((cursor,end)) }; guard !kept.isEmpty else { throw failure("Cuts removed the entire clip.") }; return kept
    }
    private func media(_ source: URL, _ job: Job, _ metadata: [String: Any]) throws {
        let video = job.request["kind"] as? String == "video", asset = AVURLAsset(url: source)
        let kept = try ranges(job.request, metadata["duration"] as? Double ?? 0)
        let composition = AVMutableComposition()
        let sourceVideo = asset.tracks(withMediaType: .video).first, sourceAudio = asset.tracks(withMediaType: .audio).first
        guard video ? sourceVideo != nil : sourceAudio != nil else { throw failure("The requested media track is missing.") }
        let targetVideo = video ? composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) : nil
        let includeAudio = sourceAudio != nil && (!video || job.request["mute"] as? Bool != true)
        let targetAudio = includeAudio ? composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) : nil
        var cursor = CMTime.zero
        for (start,end) in kept {
            let range = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: end-start, preferredTimescale: 600))
            if let track = sourceVideo, let target = targetVideo { try target.insertTimeRange(range, of: track, at: cursor) }
            if let track = sourceAudio, let target = targetAudio { try target.insertTimeRange(range, of: track, at: cursor) }
            cursor = CMTimeAdd(cursor,range.duration)
        }
        guard let session = AVAssetExportSession(asset: composition, presetName: video ? AVAssetExportPresetHighestQuality : AVAssetExportPresetAppleM4A) else { throw failure("No compatible iOS encoder is available.") }
        let type: AVFileType = video ? (job.request["format"] as? String == "mov" ? .mov : .mp4) : .m4a
        guard session.supportedFileTypes.contains(type) else { throw failure("This asset cannot use the selected output container.") }
        if let track = sourceVideo, let target = targetVideo {
            let oriented = CGRect(origin: .zero, size: track.naturalSize).applying(track.preferredTransform)
            let crop = job.request["crop"] as? [String: Any]
            let x = number(crop ?? [:],"x",0), y = number(crop ?? [:],"y",0), w = number(crop ?? [:],"width",1), h = number(crop ?? [:],"height",1)
            guard x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= 1.00001 && y+h <= 1.00001 else { throw failure("Invalid crop rectangle.") }
            let cropped = CGSize(width: oriented.width*w, height: oriented.height*h)
            let wanted = number(job.request,"height",Double(cropped.height))
            let render = CGSize(width: floor(cropped.width*wanted/cropped.height/2)*2, height: floor(wanted/2)*2)
            guard render.width >= 2 && render.height >= 2 && render.height <= 2160 else { throw failure("Unsupported output dimensions.") }
            let transform = track.preferredTransform.concatenating(CGAffineTransform(translationX: -oriented.minX-oriented.width*x, y: -oriented.minY-oriented.height*y)).concatenating(CGAffineTransform(scaleX: render.width/cropped.width, y: render.height/cropped.height))
            let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: target); layer.setTransform(transform, at: .zero)
            let instruction = AVMutableVideoCompositionInstruction(); instruction.timeRange = CMTimeRange(start: .zero,duration: cursor); instruction.layerInstructions = [layer]
            let settings = AVMutableVideoComposition(); settings.renderSize = render; settings.frameDuration = CMTime(value: 1,timescale: 30); settings.instructions = [instruction]
            session.videoComposition = settings
        }
        session.outputURL = job.output; session.outputFileType = type; session.shouldOptimizeForNetworkUse = true
        DispatchQueue.main.async {
            guard job.state == "processing" else { return }; job.session = session
            session.exportAsynchronously {
                if job.state == "cancelled" { try? FileManager.default.removeItem(at: job.output); return }
                if session.status == .completed {
                    self.worker.async {
                        do {
                            let actual = try self.probe(job.output)
                            guard (video ? actual["video"] as? Bool == true : actual["audio"] as? Bool == true && actual["video"] as? Bool != true),
                                  !includeAudio || actual["audio"] as? Bool == true,
                                  abs((actual["duration"] as? Double ?? 0)-CMTimeGetSeconds(cursor)) < max(0.5,CMTimeGetSeconds(cursor)*0.03) else { throw self.failure("Output track/duration verification failed.") }
                            if video, let height = job.request["height"] as? Int, actual["height"] as? Int != height { throw self.failure("The encoder did not produce the requested resolution.") }
                            DispatchQueue.main.async { self.finish(job) }
                        } catch { DispatchQueue.main.async { self.fail(job,error.localizedDescription) } }
                    }
                } else { DispatchQueue.main.async { if session.status == .cancelled { self.cancel(job) } else { self.fail(job,session.error?.localizedDescription ?? "iOS export failed.") } } }
            }
        }
    }
    private func image(_ source: URL, _ job: Job) throws {
        guard var image = CIImage(contentsOf: source, options: [.applyOrientationProperty: true]), image.extent.width*image.extent.height <= 16_000_000 else { throw failure("Unsupported image or image exceeds 16 megapixels.") }
        image = image.transformed(by: CGAffineTransform(translationX: -image.extent.minX,y: -image.extent.minY))
        if let crop = job.request["crop"] as? [String: Any] {
            let x = number(crop,"x",0), y = number(crop,"y",0), w = number(crop,"width",1), h = number(crop,"height",1)
            guard x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= 1.00001 && y+h <= 1.00001 else { throw failure("Invalid crop.") }
            image = image.cropped(to: CGRect(x: x*image.extent.width,y: (1-y-h)*image.extent.height,width: w*image.extent.width,height: h*image.extent.height))
            image = image.transformed(by: CGAffineTransform(translationX: -image.extent.minX,y: -image.extent.minY))
        }
        let rotation = Int(number(job.request,"rotation",0)); guard [0,90,180,270].contains(rotation) else { throw failure("Invalid rotation.") }
        if rotation != 0 { image = image.oriented(forExifOrientation: rotation == 90 ? 6 : rotation == 180 ? 3 : 8) }
        if let height = job.request["height"] as? NSNumber { let factor = CGFloat(height.doubleValue)/image.extent.height; image = image.transformed(by: CGAffineTransform(scaleX: factor,y: factor)) }
        guard image.extent.width > 0 && image.extent.height > 0 && image.extent.width*image.extent.height <= 16_000_000,
              let bitmap = CIContext().createCGImage(image, from: image.extent) else { throw failure("Could not render image.") }
        if job.state != "processing" { return }
        let type = job.request["format"] as? String == "png" ? UTType.png.identifier : UTType.jpeg.identifier
        guard let writer = CGImageDestinationCreateWithURL(job.output as CFURL,type as CFString,1,nil) else { throw failure("No image writer is available.") }
        CGImageDestinationAddImage(writer,bitmap,[kCGImageDestinationLossyCompressionQuality: number(job.request,"quality",85)/100, kCGImagePropertyOrientation: 1] as CFDictionary)
        guard CGImageDestinationFinalize(writer) else { throw failure("Image export failed.") }; _ = try probe(job.output)
    }
    private func finish(_ job: Job) {
        guard job.state == "processing" else { try? FileManager.default.removeItem(at: job.output); return }
        job.state = "completed"; job.completed = ISO8601DateFormatter().string(from: Date()); job.session = nil
    }
    private func fail(_ job: Job, _ message: String) {
        guard job.state == "processing" else { return }; job.state = "failed"; job.error = message; job.completed = ISO8601DateFormatter().string(from: Date()); job.session = nil; try? FileManager.default.removeItem(at: job.output)
    }
    private func cancel(_ job: Job) {
        guard job.state == "processing" else { return }; job.state = "cancelled"; job.session?.cancelExport(); job.session = nil; job.completed = ISO8601DateFormatter().string(from: Date()); try? FileManager.default.removeItem(at: job.output)
    }
    private func cancelAll() { jobs.values.forEach { cancel($0) } }
    private func cleanup() {
        let files = (try? FileManager.default.contentsOfDirectory(at: root,includingPropertiesForKeys: [.contentModificationDateKey],options: [.skipsHiddenFiles])) ?? []
        for file in files { if let date = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate, Date().timeIntervalSince(date) > 86400 { try? FileManager.default.removeItem(at: file) } }
    }
    private func output(_ path: String) throws -> URL {
        let file = try input(path); guard file.deletingLastPathComponent() == root.standardizedFileURL else { throw failure("Only app outputs can be exported.") }; return file
    }
    private func presenter() -> UIViewController? {
        let window = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }.first { $0.isKeyWindow }
        var controller = window?.rootViewController
        while let presented = controller?.presentedViewController { controller = presented }; return controller
    }
    private func save(_ path: String, _ result: @escaping FlutterResult) throws {
        guard saveResult == nil, let controller = presenter() else { throw failure("A save dialog cannot be opened now.") }
        let file = try output(path); saveResult = result
        let picker = UIDocumentPickerViewController(forExporting: [file],asCopy: true); picker.delegate = self; controller.present(picker,animated: true)
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { saveResult?(nil); saveResult = nil }
    func documentPicker(_ controller: UIDocumentPickerViewController,didPickDocumentsAt urls: [URL]) { saveResult?(urls.first?.absoluteString); saveResult = nil }
    private func gallery(_ path: String, _ result: @escaping FlutterResult) throws {
        let file = try output(path); guard file.pathExtension != "m4a" else { throw failure("Save audio to Files or use Share.") }
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else { DispatchQueue.main.async { result(FlutterError(code: "PERMISSION",message: "Photos access was not granted. Use Save to Files.",details: nil)) }; return }
            PHPhotoLibrary.shared().performChanges({ if file.pathExtension == "mp4" || file.pathExtension == "mov" { PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: file) } else { PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: file) } }) { ok,error in
                DispatchQueue.main.async { if ok { result("Photos") } else { result(FlutterError(code: "SAVE_ERROR",message: error?.localizedDescription ?? "Photos save failed.",details: nil)) } }
            }
        }
    }
}
