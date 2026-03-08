/*
  PdfImageModule - Expo native module for iOS.
  Renders PDF pages to PNG images using PDFKit, with document and page caching.
*/

import ExpoModulesCore
import PDFKit
import UIKit

public class PdfImageModule: Module {
  private var cache: [String: PdfDoc] = [:]

  public func definition() -> ModuleDefinition {
    Name("PdfImage")

    AsyncFunction("openPdf") { (uri: String) -> [String: Any] in
      let doc = try self.getDoc(uri: uri)
      return [
        "uri": uri,
        "pageCount": doc.pageCount
      ]
    }

    AsyncFunction("generate") { (uri: String, page: Int, scale: Float) -> [String: Any] in
      let doc = try self.getDoc(uri: uri)
      return try doc.renderPage(index: page, scale: CGFloat(scale))
    }

    AsyncFunction("generateAllPages") { (uri: String, scale: Float) -> [[String: Any]] in
      let doc = try self.getDoc(uri: uri)
      var result: [[String: Any]] = []
      for i in 0..<doc.pageCount {
        let page = try doc.renderPage(index: i, scale: CGFloat(scale))
        result.append(page)
      }
      return result
    }

    AsyncFunction("closePdf") { (uri: String) in
      if let doc = self.cache.removeValue(forKey: uri) {
        doc.cleanup()
      }
    }
  }

  private func getDoc(uri: String) throws -> PdfDoc {
    if let cached = cache[uri] {
      return cached
    }
    let doc = try PdfDoc(uri: uri)
    cache[uri] = doc
    return doc
  }
}

/*
  PdfDoc - Internal helper wrapping a PDFDocument.
  Handles loading from file://, http(s)://, data: URIs and raw paths.
  Caches rendered page images on disk.
*/
private class PdfDoc {
  let document: PDFDocument
  var pageCache: [String: [String: Any]] = [:]

  var pageCount: Int { document.pageCount }

  init(uri: String) throws {
    let data: Data

    if uri.hasPrefix("data:") {
      guard let comma = uri.firstIndex(of: ",") else {
        throw NSError(domain: "PdfImage", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 header"])
      }
      let b64 = String(uri[uri.index(after: comma)...])
      guard let decoded = Data(base64Encoded: b64) else {
        throw NSError(domain: "PdfImage", code: 500, userInfo: [NSLocalizedDescriptionKey: "Base64 decode failed"])
      }
      data = decoded
    } else if uri.hasPrefix("http://") || uri.hasPrefix("https://") || uri.hasPrefix("file://") {
      guard let url = URL(string: uri) else {
        throw NSError(domain: "PdfImage", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid URL: \(uri)"])
      }
      data = try Data(contentsOf: url)
    } else {
      let fm = FileManager.default
      guard fm.fileExists(atPath: uri) else {
        throw NSError(domain: "PdfImage", code: 404, userInfo: [NSLocalizedDescriptionKey: "File not found: \(uri)"])
      }
      guard let fileData = fm.contents(atPath: uri) else {
        throw NSError(domain: "PdfImage", code: 500, userInfo: [NSLocalizedDescriptionKey: "Cannot read file: \(uri)"])
      }
      data = fileData
    }

    guard let pdf = PDFDocument(data: data) else {
      throw NSError(domain: "PdfImage", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid PDF data"])
    }
    self.document = pdf
  }

  func renderPage(index: Int, scale: CGFloat) throws -> [String: Any] {
    let key = "\(index):\(scale)"
    if let cached = pageCache[key] { return cached }

    guard let pdfPage = document.page(at: index) else {
      throw NSError(domain: "PdfImage", code: 404, userInfo: [
        NSLocalizedDescriptionKey: "Page \(index) invalid, document has \(pageCount) pages"
      ])
    }

    var rect = pdfPage.bounds(for: .mediaBox)
    let rotation = pdfPage.rotation % 360
    if rotation == 90 || rotation == 270 {
      rect = CGRect(x: rect.origin.x, y: rect.origin.y, width: rect.height, height: rect.width)
    }

    let size = CGSize(width: rect.width * scale, height: rect.height * scale)
    let renderer = UIGraphicsImageRenderer(size: size)

    let image = renderer.image { ctx in
      ctx.cgContext.interpolationQuality = .high
      ctx.cgContext.setFillColor(UIColor.white.cgColor)
      ctx.cgContext.fill(CGRect(origin: .zero, size: size))
      ctx.cgContext.saveGState()
      ctx.cgContext.translateBy(x: 0, y: size.height)
      ctx.cgContext.scaleBy(x: 1.0, y: -1.0)
      pdfPage.draw(with: .mediaBox, to: ctx.cgContext)
      ctx.cgContext.restoreGState()
    }

    guard let pngData = image.pngData() else {
      throw NSError(domain: "PdfImage", code: 500, userInfo: [NSLocalizedDescriptionKey: "PNG conversion failed"])
    }

    let outFile = outputPath()
    try pngData.write(to: outFile)

    let result: [String: Any] = [
      "uri": outFile.absoluteString,
      "width": Int(size.width),
      "height": Int(size.height)
    ]
    pageCache[key] = result
    return result
  }

  func cleanup() {
    for (_, data) in pageCache {
      if let uriStr = data["uri"] as? String, let url = URL(string: uriStr) {
        try? FileManager.default.removeItem(at: url)
      }
    }
    pageCache.removeAll()
  }

  private func outputPath() -> URL {
    let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    return dir.appendingPathComponent("\(UUID().uuidString).png")
  }
}
