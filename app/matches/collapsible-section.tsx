'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <span className="flex-1 text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {count} match{count !== 1 ? 'es' : ''}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  );
}
