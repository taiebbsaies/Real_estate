import "server-only";
import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

export const storage: StorageProvider = new LocalStorageProvider();
