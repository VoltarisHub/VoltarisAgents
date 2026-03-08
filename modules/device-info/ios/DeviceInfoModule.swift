import ExpoModulesCore
import Metal

public class DeviceInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeviceInfo")

    AsyncFunction("getCPUInfo") { () -> [String: Any] in
      let coreCount = ProcessInfo.processInfo.activeProcessorCount
      return ["cores": coreCount]
    }

    AsyncFunction("getGPUInfo") { () -> [String: Any] in
      let metalDevice = MTLCreateSystemDefaultDevice()
      let chipName = metalDevice?.name ?? "Unknown"

      return [
        "renderer": chipName,
        "vendor": "Apple",
        "version": "Metal",
        "hasAdreno": false,
        "hasMali": false,
        "hasPowerVR": false,
        "supportsOpenCL": false,
        "gpuType": "Apple GPU (Metal)"
      ]
    }
  }
}
