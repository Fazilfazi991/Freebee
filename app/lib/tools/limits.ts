export const browserToolLimits = {
  maxFiles: 20,
  maxFileBytes: 25 * 1024 * 1024,
  maxSessionBytes: 100 * 1024 * 1024,
  maxImagePixels: 40_000_000,
} as const;

export function validateFiles(files: File[]) {
  if (files.length > browserToolLimits.maxFiles) {
    return `Choose no more than ${browserToolLimits.maxFiles} files.`;
  }

  if (files.some((file) => file.size > browserToolLimits.maxFileBytes)) {
    return 'One or more files exceed the 25 MB browser limit.';
  }

  if (files.reduce((sum, file) => sum + file.size, 0) > browserToolLimits.maxSessionBytes) {
    return 'The selected files exceed the 100 MB session limit.';
  }

  return '';
}
