import { describe, expect, it } from 'vitest';
import { groupFolders } from './ContentUploader';

function file(path: string): File {
  return { webkitRelativePath: path } as File;
}

describe('browser folder import grouping', () => {
  it('recognizes content folders inside the selected parent directory', () => {
    const result = groupFolders([
      file('prepared/video-002/video.mp4'), file('prepared/video-002/caption.txt'),
      file('prepared/video-001/video.mp4'), file('prepared/video-001/cover.jpg'),
      file('prepared/video-001/caption.txt'), file('prepared/video-002/cover.jpg'),
    ]);
    expect(result.map((item) => item.folder)).toEqual(['video-001', 'video-002']);
    expect(result.every((item) => item.video && item.cover && item.caption)).toBe(true);
  });

  it('keeps an incomplete folder separate and ignores nested files', () => {
    const result = groupFolders([
      file('prepared/video-003/video.mp4'),
      file('prepared/video-003/subfolder/cover.jpg'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].cover).toBeUndefined();
  });
});
