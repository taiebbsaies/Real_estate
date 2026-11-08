import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", () => blob);

import { StorageService } from "./storage.service";

describe("StorageService with Vercel Blob", () => {
  beforeEach(() => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN_STORE_ID", "store_abc");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("uploads privately under a random key", async () => {
    const stored = await new StorageService().saveFile(new Uint8Array([1, 2]), "Photo.PNG", "image/png");

    expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(blob.put).toHaveBeenCalledWith(
      `maintenance/${stored.storageKey}`,
      expect.any(Buffer),
      expect.objectContaining({ access: "private", contentType: "image/png", storeId: "store_abc" }),
    );
  });

  it("reads a stored photo and keeps the key inside the folder", async () => {
    blob.get.mockResolvedValue({ statusCode: 200, stream: new Response(new Uint8Array([7, 8])).body });

    const { buffer } = await new StorageService().getFile("../../secret.png");

    expect(blob.get.mock.calls[0][0]).toBe("maintenance/secret.png");
    expect([...buffer]).toEqual([7, 8]);
  });

  it("throws when the photo does not exist", async () => {
    blob.get.mockResolvedValue(null);
    await expect(new StorageService().getFile("missing.png")).rejects.toThrow();
  });

  it("deletes through the same path", async () => {
    await new StorageService().deleteFile("a.png");
    expect(blob.del).toHaveBeenCalledWith("maintenance/a.png", expect.anything());
  });

  it("rejects files over the upload limit before calling Blob", async () => {
    await expect(
      new StorageService().saveFile(new Uint8Array(4 * 1024 * 1024 + 1), "a.png", "image/png"),
    ).rejects.toThrow();
    expect(blob.put).not.toHaveBeenCalled();
  });
});
