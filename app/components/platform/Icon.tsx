import * as Icons from 'lucide-react';

export function ToolIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon =
    (Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>)[name] ??
    Icons.Wrench;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
