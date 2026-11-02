import "server-only";

export interface StorageProvider {
  save(
    buffer: Buffer,
    options: { propertyId: string; extension: string },
  ): Promise<string>;
  delete(url: string): Promise<void>;
}
