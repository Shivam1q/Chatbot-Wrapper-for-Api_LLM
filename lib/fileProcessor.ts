"use client";

import { v4 as uuidv4 } from "uuid";
import type { Attachment } from "@/types";

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ALLOWED_EXT = new Set([
  "pdf",
  "txt",
  "md",
  "csv",
  "json",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isAllowed(file: File): boolean {
  const ext = extOf(file.name);
  if (ALLOWED_EXT.has(ext)) return true;
  if (file.type && ALLOWED_MIME.has(file.type)) return true;
  return false;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const v = pdfjsLib.version || "4.10.38";
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;
  }
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) =>
      "str" in item ? item.str : ""
    );
    parts.push(strings.join(" "));
  }
  return parts.join("\n\n").trim();
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.trim();
}

export class FileProcessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileProcessError";
  }
}

/**
 * Process user-selected files into attachments.
 * @param existingCount attachments already queued (enforce max 5 total)
 */
export async function processFiles(
  files: FileList | File[],
  existingCount = 0
): Promise<Attachment[]> {
  const list = Array.from(files);
  if (list.length === 0) return [];

  if (existingCount + list.length > MAX_ATTACHMENTS) {
    throw new FileProcessError(
      `At most ${MAX_ATTACHMENTS} attachments per message (already have ${existingCount}).`
    );
  }

  const out: Attachment[] = [];

  for (const file of list) {
    if (file.size > MAX_FILE_BYTES) {
      throw new FileProcessError(
        `"${file.name}" exceeds ${MAX_FILE_BYTES / (1024 * 1024)}MB limit.`
      );
    }
    if (!isAllowed(file)) {
      throw new FileProcessError(
        `"${file.name}" has an unsupported type. Allowed: PDF, TXT, MD, CSV, JSON, DOCX, PNG, JPG, WEBP.`
      );
    }

    const ext = extOf(file.name);
    const mime = file.type || guessMimeFromExt(ext);

    if (mime.startsWith("image/")) {
      const b64 = await fileToBase64(file);
      out.push({
        id: uuidv4(),
        name: file.name,
        type: mime,
        size: file.size,
        content: b64,
      });
      continue;
    }

    if (ext === "pdf" || mime === "application/pdf") {
      const text = await extractPdfText(file);
      out.push({
        id: uuidv4(),
        name: file.name,
        type: "application/pdf",
        size: file.size,
        content: text || "(No extractable text in PDF)",
      });
      continue;
    }

    if (ext === "docx" || mime.includes("wordprocessingml")) {
      const text = await extractDocxText(file);
      out.push({
        id: uuidv4(),
        name: file.name,
        type: mime,
        size: file.size,
        content: text || "(Empty document)",
      });
      continue;
    }

    const text = await file.text();
    out.push({
      id: uuidv4(),
      name: file.name,
      type: mime || "text/plain",
      size: file.size,
      content: text,
    });
  }

  return out;
}

function guessMimeFromExt(ext: string): string {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "md":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "text/plain";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
