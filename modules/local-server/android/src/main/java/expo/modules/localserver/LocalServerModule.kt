package expo.modules.localserver

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LocalServerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocalServer")

    AsyncFunction("startForegroundServer") { port: Int, url: String? ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      LocalServerForegroundService.startService(context, port, url)
      true
    }

    AsyncFunction("stopForegroundServer") {
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      LocalServerForegroundService.stopService(context)
      true
    }

    Function("updateServerStatus") { peerCount: Int, url: String? ->
      val context = appContext.reactContext ?: return@Function
      LocalServerForegroundService.updateStatus(context, peerCount, url)
    }
  }
}
