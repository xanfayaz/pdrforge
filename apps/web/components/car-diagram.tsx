'use client';

import { PANELS, panelName } from '@pdrforge/shared';
import { cn } from '@/lib/utils';

interface Shape {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  glass?: boolean;
}

const shapes: Shape[] = [
  { id: 'bumper-f', x: 118, y: 24, w: 164, h: 42, r: 16 },
  { id: 'headlight-l', x: 86, y: 40, w: 34, h: 18, r: 6 },
  { id: 'headlight-r', x: 280, y: 40, w: 34, h: 18, r: 6 },
  { id: 'hood', x: 108, y: 72, w: 184, h: 148, r: 18 },
  { id: 'fender-fl', x: 52, y: 86, w: 56, h: 126, r: 18 },
  { id: 'fender-fr', x: 292, y: 86, w: 56, h: 126, r: 18 },
  { id: 'windshield', x: 120, y: 226, w: 160, h: 50, r: 10, glass: true },
  { id: 'mirror-l', x: 16, y: 292, w: 34, h: 16, r: 8 },
  { id: 'mirror-r', x: 350, y: 292, w: 34, h: 16, r: 8 },
  { id: 'door-fl', x: 48, y: 248, w: 62, h: 120, r: 14 },
  { id: 'door-fr', x: 290, y: 248, w: 62, h: 120, r: 14 },
  { id: 'roof-rail-l', x: 100, y: 292, w: 12, h: 140, r: 4 },
  { id: 'roof-rail-r', x: 288, y: 292, w: 12, h: 140, r: 4 },
  { id: 'roof', x: 114, y: 284, w: 172, h: 156, r: 16 },
  { id: 'door-rl', x: 48, y: 376, w: 62, h: 120, r: 14 },
  { id: 'door-rr', x: 290, y: 376, w: 62, h: 120, r: 14 },
  { id: 'sill-l', x: 28, y: 378, w: 16, h: 112, r: 4 },
  { id: 'sill-r', x: 356, y: 378, w: 16, h: 112, r: 4 },
  { id: 'rear-glass', x: 124, y: 448, w: 152, h: 44, r: 10, glass: true },
  { id: 'trunk', x: 110, y: 500, w: 180, h: 112, r: 16 },
  { id: 'fender-rl', x: 54, y: 504, w: 56, h: 108, r: 16 },
  { id: 'fender-rr', x: 290, y: 504, w: 56, h: 108, r: 16 },
  { id: 'taillight-l', x: 88, y: 608, w: 36, h: 16, r: 5 },
  { id: 'taillight-r', x: 276, y: 608, w: 36, h: 16, r: 5 },
  { id: 'bumper-r', x: 118, y: 632, w: 164, h: 42, r: 16 },
];

function path(shape: Shape) {
  const { x, y, w, h, r } = shape;
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

export function CarDiagram({
  selected,
  marked = [],
  onSelect,
}: {
  selected?: string | null;
  marked?: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <svg viewBox="0 0 400 700" className="mx-auto w-full max-w-[280px]">
        <text x="200" y="16" textAnchor="middle" fill="#8b97a8" fontSize="11">
          перед
        </text>
        {shapes.map((shape) => {
          const active = selected === shape.id;
          const hasWork = marked.includes(shape.id);
          return (
            <path
              key={`${shape.id}-stroke`}
              d={path(shape)}
              fill={active ? 'rgba(60,141,255,0.45)' : shape.glass ? '#182430' : '#1a212b'}
              stroke={active ? '#8eb7ff' : hasWork ? '#ff7a2f' : '#314052'}
              strokeWidth={active ? 2.5 : 1.4}
              className="cursor-pointer"
              onClick={() => onSelect(shape.id)}
            >
              <title>{panelName(shape.id)}</title>
            </path>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onSelect('whole')}
          className={cn(
            'rounded-full border px-2 py-1 text-[11px]',
            selected === 'whole' ? 'border-[#3c8dff] text-white' : 'border-white/10 text-[#9aa6b5]',
          )}
        >
          Весь автомобиль
        </button>
        {PANELS.filter((panel) => marked.includes(panel.id)).map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => onSelect(panel.id)}
            className="rounded-full border border-[#ff7a2f]/50 px-2 py-1 text-[11px] text-[#ffc7a3]"
          >
            {panel.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[#8b97a8]">
        {selected ? panelName(selected) : 'Выберите элемент на схеме'}
        {marked.length ? ' · оранжевый контур — уже есть работы' : ''}
      </p>
    </div>
  );
}
