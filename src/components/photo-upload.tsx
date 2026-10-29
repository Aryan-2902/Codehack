"use client";

import { useState } from "react";

// Shrinks a phone photo to at most 1280 px on the long side before upload (keeps it well under
// the 2 MB limit and makes uploads fast). Falls back to the original file if the browser can't.
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

// Photos are private: they upload to our own server and are only ever displayed through
// /api/photos/[id], which checks who is asking.
export function PhotoUpload({
  value,
  onChange,
  max = 4,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string>();

  async function addFiles(files: FileList) {
    setError(undefined);
    const room = max - value.length;
    const chosen = [...files].slice(0, room);
    if (files.length > room) setError(`You can attach up to ${max} photos`);

    let next = value;
    for (const file of chosen) {
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.set("file", await compress(file));
        const res = await fetch("/api/photos", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Upload failed");
          continue;
        }
        next = [...next, data.id];
        onChange(next);
      } catch {
        setError("Network error while uploading");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {value.map((id) => (
          <div key={id} className="animate-pop-in relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${id}`} alt="" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
            <button
              type="button"
              aria-label="Remove photo"
              disabled={disabled}
              onClick={() => onChange(value.filter((v) => v !== id))}
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-slate-800 text-xs text-white transition hover:bg-rose-600"
            >
              ×
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`u${i}`} className="skeleton h-20 w-20" />
        ))}
        {value.length + uploading < max && (
          <label
            className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 ${
              disabled ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span className="text-xl leading-none">+</span>
            Add photo
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="animate-shake text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
