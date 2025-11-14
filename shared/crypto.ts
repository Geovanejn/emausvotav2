import bcrypt from "bcryptjs";

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const ALGORITHM = "PBKDF2";

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    ALGORITHM,
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const saltHex = arrayBufferToHex(salt.buffer);
  const hashHex = arrayBufferToHex(derivedBits);

  return `${saltHex}:${hashHex}`;
}

export async function comparePassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
      return bcrypt.compareSync(password, storedHash);
    }
    
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) return false;

    const encoder = new TextEncoder();
    const salt = hexToArrayBuffer(saltHex);
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      ALGORITHM,
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: ALGORITHM,
        salt: salt,
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LENGTH * 8
    );

    const computedHashHex = arrayBufferToHex(derivedBits);
    const computedHashBytes = hexToArrayBuffer(computedHashHex);
    const storedHashBytes = hexToArrayBuffer(hashHex);
    
    return await timingSafeEqual(computedHashBytes, storedHashBytes);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}
