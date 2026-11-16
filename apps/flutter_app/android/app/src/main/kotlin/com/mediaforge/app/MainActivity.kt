package com.mediaforge.app

import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private var media: NativeMediaEngine? = null
    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        media = NativeMediaEngine(this, engine.dartExecutor.binaryMessenger)
    }
    @Deprecated("Legacy result forwarding is required by the native document export.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (media?.activityResult(requestCode, resultCode, data) != true) super.onActivityResult(requestCode, resultCode, data)
    }
    override fun onStop() {
        media?.cancelAll("Processing stopped when the app left the foreground. Retry when ready.")
        super.onStop()
    }
    override fun onDestroy() { media?.dispose(); super.onDestroy() }
}
