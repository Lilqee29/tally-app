require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PasteboardBridge'
  s.version        = package['version']
  s.summary        = 'Named UIPasteboard bridge for widget data sharing'
  s.author         = ''
  s.homepage       = 'https://github.com'
  s.platforms      = { :ios => '13.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'ios/**/*.{h,m,swift}'
end
