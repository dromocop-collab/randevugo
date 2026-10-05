import test from "node:test";
import assert from "node:assert/strict";
import { storeZip } from "../lib/pkpass-signer.js";

test("store zip writes local headers, central directory and correct CRC", () => {
  const zip = storeZip([["pass.json", Buffer.from("{}")], ["a.txt", Buffer.from("hello")]]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  // "hello" CRC-32 = 0x3610a686
  const second = 30 + "pass.json".length + 2;
  assert.equal(zip.readUInt32LE(second + 14), 0x3610a686);
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 2);
});
