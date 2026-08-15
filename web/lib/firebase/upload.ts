import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/storage";

/**
 * Upload a file to Firebase Storage and return its public download URL.
 */
export async function uploadFile(
  path: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  return getDownloadURL(snapshot.ref);
}

/**
 * Upload a business image (logo, cover, or gallery).
 */
export async function uploadBusinessImage(
  businessId: string,
  type: "logo" | "cover" | "gallery",
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = type === "gallery"
    ? `${type}_${Date.now()}.${ext}`
    : `${type}.${ext}`;
  const path = `businesses/${businessId}/public/${fileName}`;
  return uploadFile(path, file);
}

/**
 * Delete a file from Firebase Storage by its download URL.
 */
export async function deleteStorageFile(downloadUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch {
    // File may not exist, ignore
  }
}
