import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { File } from "@google-cloud/storage";
import { imageStorage } from "../../lib/image-files";
import { objectStorageClient, ObjectNotFoundError } from "../../lib/objectStorage";

export const objects = new Map<string, { bytes: Buffer; contentType: string }>();
export const reads: string[] = [];
export const writes: string[] = [];

function file(path: string) {
  return {
    async getMetadata() {
      const object = objects.get(path);
      if (!object) throw new ObjectNotFoundError();
      return [{ size: object.bytes.length, contentType: object.contentType }];
    },
    createReadStream() {
      reads.push(path);
      const object = objects.get(path);
      assert.ok(object, "Only fixture objects may be read");
      return Readable.from([object.bytes]);
    },
    async save(bytes: Buffer, options: { metadata: { contentType: string } }) {
      assert.match(path, /^\/objects\/published\//);
      writes.push(path);
      objects.set(path, { bytes: Buffer.from(bytes), contentType: options.metadata.contentType });
    },
  } as unknown as File;
}

export function installStorageFixture() {
  const originals = {
    upload: imageStorage.getObjectEntityUploadURL,
    normalize: imageStorage.normalizeObjectEntityPath,
    getFile: imageStorage.getObjectEntityFile,
    privateDir: imageStorage.getPrivateObjectDir,
    bucket: objectStorageClient.bucket,
  };
  imageStorage.getObjectEntityUploadURL = async () => `https://storage.example.invalid/objects/uploads/${randomUUID()}`;
  imageStorage.normalizeObjectEntityPath = url => new URL(url).pathname;
  imageStorage.getObjectEntityFile = async path => {
    if (!objects.has(path)) throw new ObjectNotFoundError();
    return file(path);
  };
  imageStorage.getPrivateObjectDir = () => "/fixture-bucket/private";
  Object.assign(objectStorageClient, {
    bucket: (bucket: string) => {
      assert.equal(bucket, "fixture-bucket", "Never access a real bucket");
      return {
        file: (name: string) => {
          assert.ok(name.startsWith("private/"));
          return file(`/objects/${name.slice("private/".length)}`);
        },
      };
    },
  });
  return () => {
    imageStorage.getObjectEntityUploadURL = originals.upload;
    imageStorage.normalizeObjectEntityPath = originals.normalize;
    imageStorage.getObjectEntityFile = originals.getFile;
    imageStorage.getPrivateObjectDir = originals.privateDir;
    objectStorageClient.bucket = originals.bucket;
    resetStorageFixture();
  };
}

export function resetStorageFixture() {
  objects.clear();
  reads.length = 0;
  writes.length = 0;
}
