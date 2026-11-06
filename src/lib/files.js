import { toast } from "sonner";

const dataUrlToBlob = (dataUrl) => {
  const [header, encoded] = dataUrl.split(",");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: header.match(/data:(.*?);/)?.[1] });
};

// Browsers block top-level data: URLs, and demo records hold only file metadata.
export function openStoredFile(file) {
  const blob = file instanceof Blob ? file : file?.dataUrl ? dataUrlToBlob(file.dataUrl) : null;
  if (!blob) {
    toast.info(`${file?.name || "This file"} has no stored content to preview.`);
    return;
  }
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
