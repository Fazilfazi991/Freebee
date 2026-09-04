export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
