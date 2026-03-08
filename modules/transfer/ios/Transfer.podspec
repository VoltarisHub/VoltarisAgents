Pod::Spec.new do |s|
  s.name           = 'Transfer'
  s.version        = '1.0.0'
  s.summary        = 'Background file transfer module'
  s.description    = 'Expo module for background downloads using URLSession'
  s.author         = ''
  s.homepage       = 'https://github.com/example'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
