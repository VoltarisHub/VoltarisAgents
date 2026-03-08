Pod::Spec.new do |s|
  s.name           = 'PdfImage'
  s.version        = '1.0.0'
  s.summary        = 'PDF page to image renderer'
  s.description    = 'Expo module for rendering PDF pages as PNG images'
  s.author         = ''
  s.homepage       = 'https://github.com/example'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.frameworks = 'PDFKit'
end
