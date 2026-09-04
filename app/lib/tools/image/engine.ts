export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export const extensionForFormat = (format: ImageFormat) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[format];
export function fitDimensions(width: number, height: number, targetWidth?: number, targetHeight?: number, lock = true) {
  if (!targetWidth && !targetHeight) {
    return { width, height };
  }

  if (!lock) {
    return { width: targetWidth || width, height: targetHeight || height };
  }

  const ratio = width / height;

  if (targetWidth) {
    return { width: targetWidth, height: Math.round(targetWidth / ratio) };
  }

  return { width: Math.round((targetHeight || height) * ratio), height: targetHeight || height };
}
export async function loadImage(file: File) {
  const bitmap = await createImageBitmap(file);
  return bitmap;
}
export async function transformImage(
  file: File,
  options: {
    format: ImageFormat;
    quality: number;
    width?: number;
    height?: number;
    lockAspect?: boolean;
    background?: string;
  },
) {
  const image = await loadImage(file);
  const originalWidth = image.width;
  const originalHeight = image.height;
  const dimensions = fitDimensions(image.width, image.height, options.width, options.height, options.lockAspect);

  if (dimensions.width * dimensions.height > 40_000_000) {
    image.close();
    throw new Error('The requested image exceeds the 40 megapixel browser limit.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas processing is unavailable in this browser.');
  }

  if (options.format === 'image/jpeg') {
    context.fillStyle = options.background || '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, options.format, options.quality));
  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error(`This browser cannot export ${options.format}.`);
  }

  return { blob, width: dimensions.width, height: dimensions.height, originalWidth, originalHeight };
}
