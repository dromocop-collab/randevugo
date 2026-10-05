// Apple Cüzdan .pkpass paketleyici: manifest (SHA-1), PKCS#7/CMS ayrık imza (pkijs + WebCrypto) ve sıkıştırmasız ZIP.
import { X509Certificate, createHash, createPrivateKey, webcrypto } from "crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";

export type PkpassSigning = { signerCertPem: string; signerKeyPem: string; signerKeyPassphrase?: string; wwdrPem: string };

const engine = new pkijs.CryptoEngine({ name: "node", crypto: webcrypto as unknown as Crypto });
pkijs.setEngine("node", engine as unknown as Parameters<typeof pkijs.setEngine>[1]);

// PEM başında "Bag Attributes" gibi satırlar olabilir; Node'un X509 okuyucusu bunları yok sayar.
function parseCertificate(pem: string) {
  const raw = new X509Certificate(pem).raw;
  return pkijs.Certificate.fromBER(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
}

async function importSigningKey(pem: string, passphrase?: string) {
  const pkcs8 = createPrivateKey({ key: pem, passphrase }).export({ type: "pkcs8", format: "der" });
  return webcrypto.subtle.importKey("pkcs8", pkcs8, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

/** manifest.json için ayrık CMS imzası (DER). */
export async function signManifest(manifest: Buffer, signing: PkpassSigning): Promise<Buffer> {
  const signer = parseCertificate(signing.signerCertPem);
  const wwdr = parseCertificate(signing.wwdrPem);
  const key = await importSigningKey(signing.signerKeyPem, signing.signerKeyPassphrase);
  const digest = createHash("sha256").update(manifest).digest();

  const signedData = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: "1.2.840.113549.1.7.1" }),
    signerInfos: [
      new pkijs.SignerInfo({
        version: 1,
        sid: new pkijs.IssuerAndSerialNumber({ issuer: signer.issuer, serialNumber: signer.serialNumber }),
        signedAttrs: new pkijs.SignedAndUnsignedAttributes({
          type: 0,
          attributes: [
            new pkijs.Attribute({ type: "1.2.840.113549.1.9.3", values: [new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.1" })] }),
            new pkijs.Attribute({ type: "1.2.840.113549.1.9.5", values: [new asn1js.UTCTime({ valueDate: new Date() })] }),
            new pkijs.Attribute({ type: "1.2.840.113549.1.9.4", values: [new asn1js.OctetString({ valueHex: digest })] }),
          ],
        }),
      }),
    ],
    certificates: [signer, wwdr],
  });
  const data = manifest.buffer.slice(manifest.byteOffset, manifest.byteOffset + manifest.byteLength) as ArrayBuffer;
  await signedData.sign(key, 0, "SHA-256", data);
  const contentInfo = new pkijs.ContentInfo({ contentType: pkijs.ContentInfo.SIGNED_DATA, content: signedData.toSchema(true) });
  return Buffer.from(contentInfo.toSchema().toBER(false));
}

// ── Sıkıştırmasız (STORE) ZIP ──
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function storeZip(files: Array<[string, Buffer]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 adlar
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12); // 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

/** pass.json + görseller → imzalı .pkpass */
export async function buildPkpass(files: Record<string, Buffer>, signing: PkpassSigning): Promise<Buffer> {
  const entries = Object.entries(files);
  const manifest = Buffer.from(JSON.stringify(Object.fromEntries(entries.map(([name, data]) => [name, createHash("sha1").update(data).digest("hex")]))));
  const signature = await signManifest(manifest, signing);
  return storeZip([...entries, ["manifest.json", manifest], ["signature", signature]]);
}
