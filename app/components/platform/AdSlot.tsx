export function AdSlot({ enabled = false, label = 'Advertisement' }: { enabled?: boolean; label?: string }) {
  if (!enabled) {
    return null;
  }

  return (
    <aside className="tp-ad-slot" aria-label={label}>
      {label}
    </aside>
  );
}
