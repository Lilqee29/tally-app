import { requireNativeModule } from 'expo-modules-core';

interface PasteboardBridgeModule {
  writeSharedString(value: string): Promise<boolean>;
  readSharedString(): Promise<string | null>;
}

let PasteboardBridge: PasteboardBridgeModule | null = null;

try {
  PasteboardBridge = requireNativeModule<PasteboardBridgeModule>('PasteboardBridge');
} catch {
  // Module not available (e.g. during dev or before prebuild) — degrade gracefully
}

export function writeSharedString(value: string): Promise<boolean> {
  if (!PasteboardBridge) return Promise.resolve(false);
  return PasteboardBridge.writeSharedString(value);
}

export function readSharedString(): Promise<string | null> {
  if (!PasteboardBridge) return Promise.resolve(null);
  return PasteboardBridge.readSharedString();
}
