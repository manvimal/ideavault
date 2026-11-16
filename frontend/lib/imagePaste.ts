import { RefObject } from "react";
import { api } from "@/lib/api";

/** Handles clipboard paste of an image: uploads it and inserts markdown image syntax at the cursor. */
export function createImagePasteHandler(
  textareaRef: RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (next: string) => void,
  onUploadingChange?: (uploading: boolean) => void
) {
  return async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    const el = textareaRef.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;

    onUploadingChange?.(true);
    try {
      const { url } = await api.uploadImage(file);
      const markdown = `![pasted image](${url})`;
      const next = value.slice(0, start) + markdown + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el?.focus();
        if (el) el.selectionStart = el.selectionEnd = start + markdown.length;
      });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      onUploadingChange?.(false);
    }
  };
}
