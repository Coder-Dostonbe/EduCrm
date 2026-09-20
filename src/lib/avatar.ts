"use client";

import * as React from "react";

/** The signed-in person's profile photo.
 *
 *  Kept in this browser only: there is no upload endpoint behind the app yet,
 *  so the picture lives in localStorage and follows the device, not the
 *  account. Swapping this store for a real upload later means changing
 *  `setAvatar` and nothing else.
 */
const KEY = "eduflow.avatar";

/** Photos are squared and downscaled to this before being stored — a phone
 *  snapshot as a raw data URL would blow the ~5MB localStorage budget. */
const STORED_SIZE = 256;

/** What we accept off the file input, before downscaling. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

let cached: string | null | undefined;
const listeners = new Set<() => void>();

function read(): string | null {
  if (cached !== undefined) return cached;
  try {
    cached = window.localStorage.getItem(KEY);
  } catch {
    cached = null;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setAvatar(dataUrl: string | null) {
  cached = dataUrl;
  try {
    if (dataUrl) window.localStorage.setItem(KEY, dataUrl);
    else window.localStorage.removeItem(KEY);
  } catch {
    // A full or blocked store just means the picture doesn't persist.
  }
  for (const listener of listeners) listener();
}

/** Subscribes to the stored photo. The server snapshot is null so the first
 *  client render matches the HTML and hydration stays quiet. */
export function useAvatar(): string | null {
  return React.useSyncExternalStore(subscribe, read, () => null);
}

/** Squares, downscales and re-encodes a picked file into a storable data URL.
 *  Rejects anything that isn't a decodable image. */
export async function fileToAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    // Centre-crop to a square so faces stay put whatever the aspect ratio.
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = STORED_SIZE;
    canvas.height = STORED_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, STORED_SIZE, STORED_SIZE);

    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}
