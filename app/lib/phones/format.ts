export const format = {
  weight: (v?: number) => (v == null ? 'Unknown' : `${v} g`),
  display: (v?: number) => (v == null ? 'Unknown' : `${v} inches`),
  hz: (v?: number) => (v == null ? 'Unknown' : `${v} Hz`),
  storage: (v: number[]) =>
    v.length ? v.map((x) => (x >= 1024 ? `${x / 1024} TB` : `${x} GB`)).join(' / ') : 'Unknown',
  battery: (v?: number) => (v == null ? 'Not published' : `${v} mAh`),
  watts: (v?: number) => (v == null ? 'Unknown' : `${v} W`),
  resolution: (w?: number, h?: number) => (w && h ? `${w} × ${h}` : 'Unknown'),
};
