import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

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

/** Upload a public staff profile photo. */
export async function uploadStaffImage(
  businessId: string,
  staffId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadFile(`businesses/${businessId}/public/staff/${staffId}_${Date.now()}.${ext}`, file);
}

/**
 * Hizmet görseli: tarayıcıda ortadan kare kırpılır, en fazla 600x600'e küçültülür,
 * webp (desteklenmiyorsa jpeg) olarak yüklenir. Herkese açık indirme adresini döndürür.
 */
export async function uploadServiceImage(
  businessId: string,
  file: File
): Promise<string> {
  const blob = await squareImageBlob(file, 600, 0.82);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, `businesses/${businessId}/public/services/${fileName}`);
  const snapshot = await uploadBytes(storageRef, blob, {
    contentType: blob.type,
    cacheControl: "public, max-age=31536000, immutable",
  });
  return getDownloadURL(snapshot.ref);
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Bazı tarayıcılar (eski Safari) bazı biçimlerde başarısız olur; <img> ile dene.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image-decode"));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Görseli ortadan kare kırpar ve en fazla `size` piksele küçültür. */
async function squareImageBlob(file: File, size: number, quality: number): Promise<Blob> {
  const image = await loadImage(file);
  try {
    const side = Math.min(image.width, image.height);
    if (!side) throw new Error("image-decode");
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target, target);
    context.drawImage(image.source, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, target, target);
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!jpeg) throw new Error("image-encode");
    return jpeg;
  } finally {
    image.release();
  }
}

/**
 * Upload a review image (customer review photo).
 */
export async function uploadReviewImage(
  businessId: string,
  file: File
): Promise<string> {
  const user = getAuth(getFirebaseApp()).currentUser;
  if (!user) throw new Error("Yorum fotoğrafı yüklemek için giriş yapmalısınız."); // i18n-ignore — arayüzde gösterilmez
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `businesses/${businessId}/public/reviews/${user.uid}/${fileName}`;
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
