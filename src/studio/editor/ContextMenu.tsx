import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { create } from 'zustand';

export interface ContextMenuItem {
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
  submenu?: ContextMenuItem[];
}

interface OpenMenu { x: number; y: number; items: ContextMenuItem[]; key: number }
const useContextMenu = create<{ menu: OpenMenu | null }>(() => ({ menu: null }));

/** One menu app-wide: opening another (another right-click) replaces it. */
export function openContextMenu(x: number, y: number, items: ContextMenuItem[]) {
  useContextMenu.setState({ menu: { x, y, items, key: performance.now() } });
}
export const closeContextMenu = () => useContextMenu.setState({ menu: null });

const actionable = (item: ContextMenuItem) => !item.separator && !item.disabled;

function MenuList({ items, at, anchor, onClose, onBack }: {
  items: ContextMenuItem[];
  at?: { x: number; y: number };
  anchor?: DOMRect;
  onClose: () => void;
  onBack?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [active, setActive] = useState(-1);
  // The anchor rect is captured once on open so re-renders while hovering don't re-place (and re-focus) the submenu.
  const [submenu, setSubmenuState] = useState<{ index: number; rect: DOMRect } | null>(null);
  const setSubmenu = (index: number | null) => {
    const node = index === null ? null : itemRefs.current[index];
    setSubmenuState((open) => (index === null || !node ? null : open?.index === index ? open : { index, rect: node.getBoundingClientRect() }));
  };
  const hoverTimer = useRef<number | undefined>(undefined);

  // Measure, then flip or clamp so the whole menu stays on screen.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { offsetWidth: w, offsetHeight: h } = node;
    let left: number;
    let top: number;
    if (anchor) {
      left = anchor.right + 2;
      if (left + w > innerWidth - 8) left = anchor.left - w - 2;
      top = anchor.top - 4;
    } else {
      left = at!.x;
      top = at!.y;
      if (left + w > innerWidth - 8) left = left - w;
    }
    if (top + h > innerHeight - 8) top = innerHeight - h - 8;
    setPosition({ left: Math.max(8, left), top: Math.max(8, top) });
    node.focus({ preventScroll: true });
  }, [anchor, at]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const move = (step: 1 | -1) => {
    if (!items.some(actionable)) return;
    let next = active;
    do next = (next + step + items.length) % items.length; while (!actionable(items[next]));
    setActive(next);
    setSubmenu(null);
    itemRefs.current[next]?.focus({ preventScroll: true });
  };

  const choose = (index: number) => {
    const item = items[index];
    if (!item || !actionable(item)) return;
    if (item.submenu) {
      setActive(index);
      setSubmenu(index);
      return;
    }
    onClose();
    item.onSelect?.();
  };

  return (
    <>
      <div
        ref={ref}
        role="menu"
        tabIndex={-1}
        data-context-menu
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
          else if (event.key === 'ArrowRight' && items[active]?.submenu) { event.preventDefault(); setSubmenu(active); }
          else if (event.key === 'ArrowLeft' && onBack) { event.preventDefault(); onBack(); }
          else if (event.key === 'Escape') { event.preventDefault(); onClose(); }
          else if ((event.key === 'Enter' || event.key === ' ') && active >= 0) { event.preventDefault(); choose(active); }
        }}
        onContextMenu={(event) => event.preventDefault()}
        style={{
          position: 'fixed',
          left: position?.left ?? -9999,
          top: position?.top ?? -9999,
          visibility: position ? 'visible' : 'hidden',
          '--ff-enter-y': '-3px',
        } as CSSProperties}
        className="ff-pop z-[130] min-w-[232px] rounded-xl border border-white/10 bg-zinc-900/95 p-1 text-[12.5px] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)] outline-none backdrop-blur-xl"
      >
        {items.map((item, index) => item.separator ? (
          <div key={index} role="separator" className="mx-2 my-1 border-t border-white/[0.07]" />
        ) : (
          <button
            key={index}
            ref={(node) => { itemRefs.current[index] = node; }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            aria-haspopup={item.submenu ? 'menu' : undefined}
            aria-expanded={item.submenu ? submenu?.index === index : undefined}
            onPointerEnter={() => {
              if (item.disabled) return;
              setActive(index);
              window.clearTimeout(hoverTimer.current);
              hoverTimer.current = window.setTimeout(() => setSubmenu(item.submenu ? index : null), item.submenu ? 90 : 160);
            }}
            onClick={() => choose(index)}
            className={`flex h-[30px] w-full items-center gap-2.5 rounded-md px-2 text-left outline-none transition-colors duration-75 disabled:opacity-35 ${active === index
              ? item.danger ? 'bg-red-500/85 text-white' : 'bg-indigo-500/90 text-white'
              : item.danger ? 'text-red-300' : 'text-zinc-200'}`}
          >
            <span className={`flex w-4 shrink-0 justify-center ${active === index ? 'text-white' : 'text-zinc-400'}`}>{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcut && <span className={`pl-6 text-[11px] tracking-wide ${active === index ? 'text-white/75' : 'text-zinc-500'}`}>{item.shortcut}</span>}
            {item.submenu && <ChevronRight size={13} className={active === index ? 'text-white/80' : 'text-zinc-500'} />}
          </button>
        ))}
      </div>
      {submenu && items[submenu.index]?.submenu && (
        <MenuList
          items={items[submenu.index].submenu!}
          anchor={submenu.rect}
          onClose={onClose}
          onBack={() => {
            setSubmenu(null);
            ref.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </>
  );
}

/** Mount once. Renders whatever openContextMenu last asked for. */
export function ContextMenuHost() {
  const menu = useContextMenu((state) => state.menu);

  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-context-menu]')) closeContextMenu();
    };
    const close = () => closeContextMenu();
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  if (!menu) return null;
  return createPortal(<MenuList key={menu.key} items={menu.items} at={{ x: menu.x, y: menu.y }} onClose={closeContextMenu} />, document.body);
}
