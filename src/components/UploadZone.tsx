"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  label: string;
  placeholder: string;
  icon: "person" | "garment";
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
}

export default function UploadZone({
  label,
  placeholder,
  icon,
  onFileSelect,
  previewUrl,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div
        className={`upload-zone relative border-2 border-dashed border-surface-200 rounded-2xl bg-white p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 ${
          isDragOver ? "dragover" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {previewUrl ? (
          <img
            src={previewUrl}
            className="w-full max-h-48 object-contain rounded-xl mx-auto"
            alt={label}
          />
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-surface-100 flex items-center justify-center">
              {icon === "person" ? (
                <svg
                  className="w-6 h-6 text-surface-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-surface-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-surface-700">{placeholder}</p>
            <p className="text-xs text-surface-400">or drag & drop</p>
          </div>
        )}
      </div>
    </div>
  );
}
