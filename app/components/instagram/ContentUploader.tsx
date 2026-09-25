import { useEffect, useRef, useState } from 'react';
import { useRevalidator } from '@remix-run/react';

type Report = { folder: string; result: string; success: boolean };
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_COVER = 5 * 1024 * 1024;

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function magic(file: File, kind: 'video' | 'cover'): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return kind === 'video' ? bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
    : bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

async function videoMetadata(file: File): Promise<{ durationSeconds?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let completed = false;
    const finish = (value: { durationSeconds?: number; width?: number; height?: number }) => {
      if (completed) return;
      completed = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const done = () => finish({
      durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) / 1000 : undefined,
      width: video.videoWidth || undefined, height: video.videoHeight || undefined,
    });
    video.preload = 'metadata';
    video.onloadedmetadata = done;
    video.onerror = () => finish({});
    video.src = url;
    setTimeout(() => { if (!completed) { video.src = ''; finish({}); } }, 7000);
  });
}

async function postAction(fields: Record<string, string>): Promise<Record<string, unknown>> {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  const response = await fetch('/dashboard/instagram/content', { method: 'POST', body: form,
    credentials: 'same-origin', cache: 'no-store' });
  let value: Record<string, unknown>;
  try { value = await response.json() as Record<string, unknown>; }
  catch { throw new Error('The content service did not respond.'); }
  if (!response.ok) {
    const code = typeof value.error === 'string' ? value.error : 'upload_failed';
    throw new Error(code === 'duplicate_content' ? 'This video is already in the library.'
      : code === 'invalid_video_size' ? 'The video must be under 50 MB and the cover under 5 MB.'
        : code === 'invalid_uploaded_files' ? 'The stored MP4 or JPEG failed validation.'
          : 'The item could not be saved. Review the files and try again.');
  }
  return value;
}

async function uploadSigned(url: string, file: File): Promise<void> {
  const data = new FormData();
  data.append('cacheControl', '3600');
  data.append('', file);
  const response = await fetch(url, { method: 'PUT', body: data, headers: { 'x-upsert': 'false' } });
  if (!response.ok) throw new Error('Storage rejected the file. Check the 50 MB project limit.');
}

async function uploadItem(input: { video: File; cover: File; caption: string; title: string }): Promise<string> {
  const { video, cover, caption, title } = input;
  if (!video.name.toLowerCase().endsWith('.mp4') || video.size < 1 || video.size > MAX_VIDEO ||
      !cover.name.toLowerCase().endsWith('.jpg') || cover.size < 1 || cover.size > MAX_COVER) {
    throw new Error('Use an MP4 under 50 MB and a JPG cover under 5 MB.');
  }
  if (!caption.trim() || caption.trim().length > 2200) throw new Error('Caption must have 1–2,200 characters.');
  const [videoValid, coverValid] = await Promise.all([magic(video, 'video'), magic(cover, 'cover')]);
  if (!videoValid || !coverValid) throw new Error('The video or cover has an invalid file format.');
  const [videoHash, coverHash, metadata] = await Promise.all([sha256(video), sha256(cover), videoMetadata(video)]);
  if (metadata.durationSeconds !== undefined && (metadata.durationSeconds < 3 || metadata.durationSeconds > 900)) {
    throw new Error('Reels must be between 3 seconds and 15 minutes.');
  }
  const started = await postAction({ intent: 'begin_upload', title, caption: caption.trim(), videoHash, coverHash,
    videoSize: String(video.size), coverSize: String(cover.size) });
  if (typeof started.contentId !== 'string' || typeof started.videoUploadUrl !== 'string' ||
      typeof started.coverUploadUrl !== 'string') throw new Error('Upload setup was incomplete.');
  // Direct browser-to-Storage uploads keep video bytes out of Vercel Functions.
  await uploadSigned(started.videoUploadUrl, video);
  await uploadSigned(started.coverUploadUrl, cover);
  const final = await postAction({ intent: 'finalize_upload', contentId: started.contentId,
    ...(metadata.durationSeconds !== undefined ? { durationSeconds: String(metadata.durationSeconds) } : {}),
    ...(metadata.width !== undefined ? { width: String(metadata.width) } : {}),
    ...(metadata.height !== undefined ? { height: String(metadata.height) } : {}),
  });
  return `V${String(final.contentNumber).padStart(3, '0')} Ready`;
}

export function groupFolders(files: File[]): Array<{ folder: string; video?: File; cover?: File; caption?: File }> {
  const folders = new Map<string, { folder: string; video?: File; cover?: File; caption?: File }>();
  for (const file of files) {
    const parts = file.webkitRelativePath.replaceAll('\\', '/').split('/');
    // Directory selection includes the selected parent before each content folder.
    if (parts.length !== 3 || !parts[1]) continue;
    const folder = folders.get(parts[1]) ?? { folder: parts[1] };
    if (parts[2] === 'video.mp4') folder.video = file;
    if (parts[2] === 'cover.jpg') folder.cover = file;
    if (parts[2] === 'caption.txt') folder.caption = file;
    folders.set(parts[1], folder);
  }
  return [...folders.values()].sort((a, b) => a.folder.localeCompare(b.folder));
}

export function ContentUploader() {
  const revalidator = useRevalidator();
  const [video, setVideo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => { folderInput.current?.setAttribute('webkitdirectory', ''); }, []);

  const single = async () => {
    if (!video || !cover) { setReports([{ folder: 'Single upload', result: 'Choose an MP4 and a JPG cover.', success: false }]); return; }
    setBusy(true); setReports([]);
    try { const result = await uploadItem({ video, cover, caption, title });
      setReports([{ folder: 'Single upload', result, success: true }]); revalidator.revalidate();
    } catch (error) { setReports([{ folder: 'Single upload', result: error instanceof Error ? error.message : 'Upload failed.', success: false }]); }
    finally { setBusy(false); }
  };

  const bulk = async () => {
    setBusy(true); setReports([]);
    const folders = groupFolders(folderFiles);
    if (!folders.length) { setReports([{ folder: 'Folder import', result: 'Choose a folder containing video-001 style subfolders.', success: false }]); setBusy(false); return; }
    let imported = false;
    for (const folder of folders) {
      if (!folder.video || !folder.cover || !folder.caption) {
        const missing = [!folder.video && 'video.mp4', !folder.cover && 'cover.jpg', !folder.caption && 'caption.txt'].filter(Boolean).join(', ');
        setReports((rows) => [...rows, { folder: folder.folder, result: `Missing ${missing}`, success: false }]);
        continue;
      }
      try {
        const text = await folder.caption.text();
        const result = await uploadItem({ video: folder.video, cover: folder.cover, caption: text, title: folder.folder });
        imported = true;
        setReports((rows) => [...rows, { folder: folder.folder, result, success: true }]);
      } catch (error) {
        setReports((rows) => [...rows, { folder: folder.folder,
          result: error instanceof Error ? error.message : 'Import failed.', success: false }]);
      }
    }
    setBusy(false);
    if (imported) revalidator.revalidate();
  };

  return <section className="ig-panel ig-upload-panel" aria-label="Add content">
    <div className="ig-section-head"><h2>Add content</h2><span>Files go directly to private Storage</span></div>
    <div className="ig-upload-grid">
      <div className="ig-upload-column"><h3>Single item</h3><p>One MP4, caption, and JPG cover.</p>
        <div className="ig-settings-form"><label>Video<input type="file" accept="video/mp4,.mp4" onChange={(event) => setVideo(event.target.files?.[0] ?? null)} /></label>
          <label>Cover<input type="file" accept="image/jpeg,.jpg" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /></label>
          <label>Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={4} maxLength={2200} /></label>
          <label>Title (optional)<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /></label>
          <button className="ig-button ig-button-primary" type="button" disabled={busy} onClick={single}>Upload item</button></div>
      </div>
      <div className="ig-upload-column"><h3>Import folders</h3><p>Select a parent folder. Each child folder needs video.mp4, caption.txt, and cover.jpg.</p>
        <label className="ig-folder-picker">Choose parent folder<input ref={folderInput} type="file" multiple
          onChange={(event) => setFolderFiles(Array.from(event.target.files ?? []))} /></label>
        <p className="ig-hint">{folderFiles.length ? `${groupFolders(folderFiles).length} content folders selected` : 'Each valid folder imports separately. Invalid folders are reported below.'}</p>
        <button className="ig-button" type="button" disabled={busy || !folderFiles.length} onClick={bulk}>Import folders</button>
      </div>
    </div>
    {busy && <p className="ig-notice" role="status">Uploading and validating content. Keep this tab open.</p>}
    {reports.length > 0 && <div className="ig-import-results" role="status">{reports.map((report) => <div key={`${report.folder}:${report.result}`}>
      <strong>{report.folder}</strong><span className={report.success ? 'ig-result-ok' : 'ig-result-error'}>{report.result}</span>
    </div>)}</div>}
    <p className="ig-hint">Current Supabase Free limit: MP4 under 50 MB. JPG covers under 5 MB. Uploaded items never publish by themselves.</p>
  </section>;
}
