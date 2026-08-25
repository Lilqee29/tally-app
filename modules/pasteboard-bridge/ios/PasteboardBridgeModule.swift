import ExpoModulesCore

let SHARED_PASTEBOARD_NAME = "com.qomex.tally.shared.pasteboard"

public class PasteboardBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PasteboardBridge")

    Function("writeSharedString") { (value: String) -> Bool in
      guard let pb = UIPasteboard(name: UIPasteboard.Name(SHARED_PASTEBOARD_NAME), create: true) else {
        return false
      }
      pb.string = value
      return true
    }

    Function("readSharedString") { () -> String? in
      guard let pb = UIPasteboard(name: UIPasteboard.Name(SHARED_PASTEBOARD_NAME), create: false) else {
        return nil
      }
      return pb.string
    }
  }
}
