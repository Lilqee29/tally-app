import { requireNativeModule } from 'expo-modules-core';

interface PasteboardBridgeModule {
  writeSharedString(value: string): Promise<boolean>;
  readSharedString(): Promise<string | null>;
}

const PasteboardBridge = requireNativeModule<PasteboardBridgeModule>('PasteboardBridge');

export default PasteboardBridge;
