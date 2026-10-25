import { useEffect, useLayoutEffect, useRef } from 'react';
import type { TextElement } from '../model/types';
import { baseUnit } from '../model/units';
import { paintCss } from '../render/paint';
import { useEditor } from '../store/editorStore';
import { fontStack } from '../text/fontLoader';

interface TextEditorOverlayProps {
  slideId: string;
  element: TextElement;
  canvasWidth: number;
  canvasHeight: number;
}

/** In-place editor for a text element: raw markup (`*accent*`) in a textarea that matches the type. */
export function TextEditorOverlay({ slideId, element, canvasWidth, canvasHeight }: TextEditorOverlayProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const unit = baseUnit(canvasWidth, canvasHeight);
  const color = element.fill.kind === 'solid' ? element.fill.color : '#0F172A';

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  });

  const finish = () => {
    useEditor.getState().setEditingText(null);
    useEditor.setState({ lastCoalesce: null });
  };

  return (
    <div
      data-text-editor="true"
      style={{
        position: 'absolute',
        left: element.x * canvasWidth,
        top: element.y * canvasHeight,
        width: element.w * canvasWidth,
        transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
        zIndex: 20,
      }}
    >
      <textarea
        ref={ref}
        value={element.text}
        spellCheck={false}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => useEditor.getState().updateElements(slideId, [element.id], { text: event.target.value }, { coalesce: `text-${element.id}` })}
        onBlur={finish}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape' || ((event.metaKey || event.ctrlKey) && event.key === 'Enter')) {
            event.preventDefault();
            finish();
          }
        }}
        style={{
          display: 'block',
          width: '100%',
          resize: 'none',
          overflow: 'hidden',
          border: 'none',
          outline: 'none',
          boxShadow: `0 0 0 ${unit * 3}px rgba(99, 102, 241, 0.9)`,
          borderRadius: unit * 6,
          background: element.plate.enabled ? paintCss(element.plate.paint) : 'rgba(255, 255, 255, 0.55)',
          padding: 0,
          margin: 0,
          fontFamily: fontStack(element.fontFamily),
          fontWeight: element.fontWeight,
          fontSize: element.fontSize * unit,
          lineHeight: element.lineHeight,
          letterSpacing: `${element.letterSpacing}em`,
          textAlign: element.align,
          textTransform: element.transform === 'uppercase' ? 'uppercase' : 'none',
          color,
          caretColor: '#6366F1',
        }}
      />
    </div>
  );
}
