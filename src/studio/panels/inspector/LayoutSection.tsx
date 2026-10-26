import { useState } from 'react';
import { SLIDE_LAYOUTS, applySlideLayout, type SlideLayout } from '../../model/slideLayouts';
import { useEditor } from '../../store/editorStore';
import { Section, Segmented } from '../../ui';

function LayoutTile({ layout, onClick }: { layout: SlideLayout; onClick: () => void }) {
  const clipId = `layout-clip-${layout.id}`;
  return (
    <button
      type="button"
      title={layout.name}
      aria-label={layout.name}
      onClick={onClick}
      className="group min-w-0 focus-visible:outline-none"
    >
      <span className="block aspect-[1/2] w-full overflow-hidden rounded-md bg-white/[0.04] ring-1 ring-white/[0.06] transition-colors group-hover:bg-white/[0.09] group-hover:ring-indigo-400/60 group-focus-visible:ring-2 group-focus-visible:ring-indigo-500">
        <svg viewBox="0 0 100 200" className="h-full w-full" aria-hidden="true">
          <defs><clipPath id={clipId}><rect width="100" height="200" rx="7" /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            {!layout.hideText && layout.title && (
              <>
                <rect x={layout.title.align === 'left' ? layout.title.x * 100 - layout.title.w * 50 : (100 - layout.title.w * 100) / 2} y={layout.title.y * 200 - 5} width={layout.title.w * 100} height="3.5" rx="1.75" fill="#e4e4e7" />
                <rect x={layout.title.align === 'left' ? layout.title.x * 100 - layout.title.w * 50 : (100 - layout.title.w * 65) / 2} y={layout.title.y * 200 + 1} width={layout.title.w * 65} height="3.5" rx="1.75" fill="#e4e4e7" />
              </>
            )}
            {!layout.hideText && layout.subtitle && (
              <rect x={layout.subtitle.x * 100 - layout.subtitle.w * 50} y={layout.subtitle.y * 200 - 1.5} width={layout.subtitle.w * 100} height="2" rx="1" fill="#71717a" />
            )}
            {layout.devices.map((device, index) => {
              const height = device.h * 200;
              const width = height * 0.47;
              return <rect key={index} x={device.x * 100 - width / 2} y={device.y * 200 - height / 2} width={width} height={height} rx={Math.min(7, width * 0.12)} transform={`rotate(${device.rotation} ${device.x * 100} ${device.y * 200})`} fill="white" fillOpacity="0.1" stroke="#d4d4d8" strokeWidth="1.5" />;
            })}
          </g>
        </svg>
      </span>
    </button>
  );
}

export function LayoutSection() {
  const slideId = useEditor((state) => state.selection.slideId);
  const groupSize = useEditor((state) => state.selection.slideIds.length);
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const store = useEditor.getState;

  return (
    <Section
      title="Layout"
      actions={<Segmented<'this' | 'all'> size="sm" value={scope} onChange={setScope} options={[{ value: 'this', label: groupSize > 1 ? 'Selected' : 'This', title: groupSize > 1 ? 'The selected screenshots' : 'This screenshot' }, { value: 'all', label: 'All', title: 'All screenshots' }]} />}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {SLIDE_LAYOUTS.map((layout) => (
          <LayoutTile
            key={layout.id}
            layout={layout}
            onClick={() => {
              if (!slideId) return;
              store().commit((draft) => {
                const { slideIds } = store().selection;
                const ids = scope === 'all' ? draft.slides.map((slide) => slide.id) : slideIds.length > 1 ? slideIds : [slideId];
                for (const id of ids) applySlideLayout(draft, id, layout.id);
              });
            }}
          />
        ))}
      </div>
    </Section>
  );
}
