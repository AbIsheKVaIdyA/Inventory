"use client";

import { CameraIcon, Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { normalizeKey } from "@/lib/fuzzy-text";

import { cn } from "@/lib/utils";

type TagOcrCaptureProps = {
  disabled?: boolean;
  onCaptured: (text: string) => void;
  className?: string;
  /** Compact icon button vs labeled */
  variant?: "icon" | "labeled";
};

function pickBestTagCandidate(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = lines.join(" ");
  const candidates: string[] = [];

  for (const line of lines) {
    candidates.push(line);
  }

  // Token-ish chunks that look like asset tags
  const tokenRe = /\b[A-Z0-9][A-Z0-9._\-/]{2,24}\b/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(joined)) !== null) {
    candidates.push(m[0]);
  }

  const scored = candidates
    .map((c) => {
      const cleaned = c.replace(/\s+/g, " ").trim();
      const norm = normalizeKey(cleaned);
      let score = 0;
      if (/\d/.test(norm)) score += 3;
      if (/[a-z]/i.test(norm)) score += 2;
      if (norm.length >= 4 && norm.length <= 18) score += 4;
      if (norm.length > 18) score -= 2;
      if (/^(tag|serial|asset|ecs|property)/i.test(cleaned)) score -= 4;
      return { cleaned, norm, score };
    })
    .filter((c) => c.norm.length >= 3)
    .sort((a, b) => b.score - a.score || a.norm.length - b.norm.length);

  return scored[0]?.cleaned ?? null;
}

export function TagOcrCapture({
  disabled,
  onCaptured,
  className,
  variant = "icon",
}: TagOcrCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runOcr(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => undefined,
      });
      try {
        const {
          data: { text },
        } = await worker.recognize(file);
        const best = pickBestTagCandidate(text);
        if (!best) {
          setError("Couldn’t read a tag — try a closer, brighter photo.");
          return;
        }
        onCaptured(best);
      } finally {
        await worker.terminate();
      }
    } catch {
      setError("Camera OCR failed. Check permission and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void runOcr(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        aria-busy={busy}
        aria-label={busy ? "Reading tag from photo" : "Scan tag with camera"}
        title="Scan tag with camera"
        onClick={() => inputRef.current?.click()}
        className={cn(
          variant === "icon"
            ? "size-11 shrink-0 rounded-xl border-teal-400/40 bg-teal-950/30 px-0 text-teal-100 hover:bg-teal-950/50"
            : "h-11 gap-2 rounded-xl border-teal-400/40 bg-teal-950/30 px-3 text-teal-50 hover:bg-teal-950/50"
        )}
      >
        {busy ? (
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
        ) : (
          <CameraIcon className="size-5" aria-hidden />
        )}
        {variant === "labeled" ? (
          <span className="text-sm font-semibold">{busy ? "Reading…" : "Camera"}</span>
        ) : null}
      </Button>
      {error ? (
        <p role="alert" className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg bg-red-950/95 px-2 py-1 text-[0.65rem] text-red-100 shadow-lg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
