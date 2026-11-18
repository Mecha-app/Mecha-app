/**
 * Native shell bridge (app-conversion prep, 2026-11-18) — the ONE
 * place web code talks to the Capacitor shell (capacitor.config.ts).
 *
 * Feature detection is the whole contract: in a browser every export
 * is inert (isNativeShell() false, pickPhoto() null, shareReport()
 * false) and the site behaves exactly as it always has. Inside the
 * iOS/Android shell the same calls route to the native camera and
 * share sheet. Plugins are imported dynamically, only after the
 * native check passes, so the browser bundle never loads them.
 *
 * Nothing here touches a server route — the scan page feeds a picked
 * photo into the exact same handlers its file inputs use.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Take or pick a photo through the native camera plugin and hand it
 * back as a File the existing photo handlers already accept. Returns
 * null when not in the shell, when the user cancels, or on any
 * failure — callers fall back to the file input untouched.
 */
export async function pickPhotoNative(filename: string): Promise<File | null> {
  if (!isNativeShell()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 85,
      allowEditing: false,
      correctOrientation: true,
      promptLabelHeader: "Add a photo",
      promptLabelPhoto: "Choose from gallery",
      promptLabelPicture: "Take a photo",
    });
    if (!photo.dataUrl) return null;
    const blob = await (await fetch(photo.dataUrl)).blob();
    return new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });
  } catch {
    // User cancelled the picker, denied permission, or the plugin is
    // unavailable — the file input remains the path of last resort.
    return null;
  }
}

/**
 * Share a report link through the native share sheet (shell) or the
 * Web Share API (mobile browsers that offer one). Returns false when
 * no share path exists so the caller can fall back to copy-link.
 */
export async function shareReport(input: {
  title: string;
  text: string;
  url: string;
}): Promise<boolean> {
  if (isNativeShell()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.title,
      });
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: input.title,
        text: input.text,
        url: input.url,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** True when some share path (native sheet or Web Share) exists. */
export function canShareReport(): boolean {
  return (
    isNativeShell() ||
    (typeof navigator !== "undefined" && "share" in navigator)
  );
}
