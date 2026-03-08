/*
  PdfImageModule - Expo native module for Android.
  Renders PDF pages to PNG images using PdfRenderer, with document and page caching.
*/

package expo.modules.pdfimage

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PdfImageModule : Module() {
  private val cache = HashMap<String, PdfDoc>()

  override fun definition() = ModuleDefinition {
    Name("PdfImage")

    AsyncFunction("openPdf") { uri: String ->
      val doc = getDoc(uri)
      mapOf(
        "uri" to uri,
        "pageCount" to doc.pageCount()
      )
    }

    AsyncFunction("generate") { uri: String, page: Int, scale: Float ->
      val doc = getDoc(uri)
      doc.renderPage(page, scale)
    }

    AsyncFunction("generateAllPages") { uri: String, scale: Float ->
      val doc = getDoc(uri)
      val result = mutableListOf<Map<String, Any>>()
      for (i in 0 until doc.pageCount()) {
        result.add(doc.renderPage(i, scale))
      }
      result
    }

    AsyncFunction("closePdf") { uri: String ->
      cache.remove(uri)?.cleanup()
    }
  }

  private fun getDoc(uri: String): PdfDoc {
    return cache.getOrPut(uri) {
      PdfDoc(appContext.reactContext!!, uri)
    }
  }
}
