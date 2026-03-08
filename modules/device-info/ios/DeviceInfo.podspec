Pod::Spec.new do |s|
  s.name           = 'DeviceInfo'
  s.version        = '1.0.0'
  s.summary        = 'Device CPU and GPU info'
  s.description    = 'Expo module for device capability detection'
  s.author         = ''
  s.homepage       = 'https://github.com/example'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.frameworks = 'Metal'
end
