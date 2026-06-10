/* Savoro · Mobile kit — app context + shared iOS primitives.
   Everything styles against Savoro DS tokens (var(--*)). */
const { useState, useEffect, useRef, useContext, createContext, useCallback } = React;

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ── Press feedback (iOS scale-to-0.97) ───────────────────
function Pressable({ children, onClick, scale = 0.97, style = {}, as = 'div', stop, ...rest }) {
  const [down, setDown] = useState(false);
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      style={{
        transform: down ? `scale(${scale})` : 'scale(1)',
        transition: 'transform .18s var(--ease-out)',
        WebkitTapHighlightColor: 'transparent', cursor: 'pointer', ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ── Avatar — flat tinted square, initials ────────────────
function Avatar({ user, size = 34, radius }) {
  const u = typeof user === 'string' ? USERS[user] || ME : user;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: radius != null ? radius : Math.round(size * 0.32),
      background: u.tint, color: 'var(--sand-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, letterSpacing: '-0.02em',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
    }}>{u.initials}</div>
  );
}

// ── Circular icon button (glass) ─────────────────────────
function IconBtn({ icon, onClick, size = 36, dark, active, label }) {
  return (
    <Pressable onClick={onClick} as="button" aria-label={label} style={{
      width: size, height: size, borderRadius: 9999, border: '1px solid var(--border-glass)',
      background: active ? 'var(--accent-soft)' : 'var(--glass-strong)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      color: active ? 'var(--accent-strong)' : 'var(--text-body)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      boxShadow: 'var(--shadow-sm)',
    }}>{icon}</Pressable>
  );
}

// ── Macro dots row (P / C / F) ───────────────────────────
function MacroDots({ p, c, f, size = 'sm', gap = 8 }) {
  const fs = size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)';
  const dot = (col) => <span style={{ width: 6, height: 6, borderRadius: 9999, background: col }} />;
  const item = (label, val, col) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: fs, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
      {dot(col)}{label} {val}g
    </span>
  );
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {item('P', p, 'var(--macro-protein)')}
      {item('C', c, 'var(--macro-carbs)')}
      {item('F', f, 'var(--macro-fat)')}
    </div>
  );
}

// ── Trust / provenance badge (subtle) ────────────────────
function TrustBadge({ source, size = 'sm' }) {
  const label = SOURCE_LABEL[source] || 'Verified';
  const tone = source === 'creator' ? 'var(--text-muted)' : 'var(--positive)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)',
      fontWeight: 600, color: tone,
    }}>
      <IconShield size={size === 'sm' ? 13 : 15} stroke={1.7} />{label}
    </span>
  );
}

// ── Creator row ──────────────────────────────────────────
function CreatorRow({ handle, meta, size = 28, action }) {
  const u = USERS[handle] || ME;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Avatar user={u} size={size} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.2 }}>@{u.handle}</div>
        {meta && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.3 }}>{meta}</div>}
      </div>
      {action}
    </div>
  );
}

// ── Tag / category chip ──────────────────────────────────
function Chip({ children, active, onClick, tone = 'default' }) {
  const styles = active
    ? { background: 'var(--sand-900)', color: 'var(--sand-50)', border: '1px solid var(--sand-900)' }
    : { background: 'var(--glass-strong)', color: 'var(--text-body)', border: '1px solid var(--border)' };
  return (
    <Pressable as="button" onClick={onClick} style={{
      whiteSpace: 'nowrap', borderRadius: 9999, padding: '7px 14px',
      fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '-0.01em',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...styles,
    }}>{children}</Pressable>
  );
}

// ── iOS segmented control ────────────────────────────────
function Segmented({ options, value, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => (o.value ?? o) === value));
  return (
    <div style={{ position: 'relative', display: 'flex', padding: 3, borderRadius: 11, background: 'var(--sand-200)' }}>
      <div style={{
        position: 'absolute', top: 3, bottom: 3, left: `calc(3px + ${idx} * (100% - 6px) / ${options.length})`,
        width: `calc((100% - 6px) / ${options.length})`, borderRadius: 8, background: 'var(--surface-card-strong)',
        boxShadow: 'var(--shadow-sm)', transition: 'left .22s var(--ease-out)',
      }} />
      {options.map((o) => {
        const val = o.value ?? o, lbl = o.label ?? o;
        const on = val === value;
        return (
          <button key={val} onClick={() => onChange(val)} style={{
            position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'transparent',
            padding: '7px 4px', fontSize: 'var(--text-sm)', fontWeight: on ? 700 : 500,
            color: on ? 'var(--text-strong)' : 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', transition: 'color .2s',
          }}>{lbl}</button>
        );
      })}
    </div>
  );
}

// ── Section header ───────────────────────────────────────
function SectionTitle({ children, action, onAction, size = 'md', style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, ...style }}>
      <h3 style={{ margin: 0, fontSize: size === 'lg' ? 'var(--text-xl)' : 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{children}</h3>
      {action && <Pressable as="button" onClick={onAction} style={{ border: 'none', background: 'none', padding: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--accent-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{action}</Pressable>}
    </div>
  );
}

// ── Eyebrow / section label ──────────────────────────────
function Eyebrow({ children, style = {} }) {
  return <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-subtle)', ...style }}>{children}</div>;
}

// ── Dish header (gradient placeholder, photo-swappable) ───
function DishHeader({ recipe, height = 200, rounded = 0, children, slotId }) {
  return (
    <div style={{ position: 'relative', height, background: recipe.grad, borderRadius: rounded, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 28% 32%, rgba(255,255,255,0.4) 0%, transparent 58%)' }} />
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Bottom sheet shell + host
// ══════════════════════════════════════════════════════════
function Sheet({ open, onClose, children, title, maxHeight = '90%', detent }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(28,24,18,0.32)',
        opacity: open ? 1 : 0, transition: 'opacity .3s var(--ease-out)',
        zIndex: 40, pointerEvents: open ? 'auto' : 'none',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
        transform: open ? 'translateY(0)' : 'translateY(102%)',
        transition: 'transform .34s var(--ease-out)',
        maxHeight, display: 'flex', flexDirection: 'column',
        background: 'var(--surface-card-strong)',
        backdropFilter: 'blur(24px) saturate(150%)', WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        border: '1px solid var(--border-glass)', borderBottom: 'none',
        boxShadow: '0 -16px 50px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: title ? 4 : 10 }}>
          <div style={{ width: 38, height: 5, borderRadius: 9999, background: 'var(--border-strong)' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{title}</h2>
            <IconBtn size={32} icon={<IconX size={17} />} onClick={onClose} label="Close" />
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '0 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 16px))' }}>
          {children}
        </div>
        <div style={{ height: 18 }} />
      </div>
    </>
  );
}

function SheetHost({ sheet, onClose, render }) {
  const [active, setActive] = useState(sheet);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (sheet) { setActive(sheet); const r = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(r); }
    if (active) { setOpen(false); const t = setTimeout(() => setActive(null), 340); return () => clearTimeout(t); }
  }, [sheet]); // eslint-disable-line
  if (!active) return null;
  return <Sheet open={open} onClose={onClose} title={active.title}>{render(active)}</Sheet>;
}

// ── Toast (confirmation) ─────────────────────────────────
function Toast({ toast }) {
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 104, zIndex: 70,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      transform: toast ? 'translateY(0)' : 'translateY(16px)',
      opacity: toast ? 1 : 0, transition: 'all .3s var(--ease-out)',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, maxWidth: '100%',
        background: 'var(--surface-inverse)', color: 'var(--sand-50)',
        padding: '11px 18px', borderRadius: 9999, boxShadow: 'var(--shadow-float)',
        fontSize: 'var(--text-sm)', fontWeight: 600,
      }}>
        {toast?.icon === 'check' && <span style={{ display: 'inline-flex', color: 'var(--sage-300)' }}><IconCheck size={17} /></span>}
        {toast?.icon === 'bookmark' && <span style={{ display: 'inline-flex', color: 'var(--blush-300)' }}><IconBookmark size={16} /></span>}
        {toast?.icon === 'fork' && <span style={{ display: 'inline-flex', color: 'var(--blush-300)' }}><IconFork size={16} /></span>}
        {toast?.icon === 'lock' && <span style={{ display: 'inline-flex', color: 'var(--sand-400)' }}><IconLock size={15} /></span>}
        <span>{toast?.msg}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Tab bar
// ══════════════════════════════════════════════════════════
const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'cookbook', label: 'Cookbook', Icon: IconCookbook },
  { id: 'discover', label: 'Discover', Icon: IconDiscover },
  { id: 'profile', label: 'Profile', Icon: IconProfile },
];
function TabBar({ tab, setTab }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 20px))', paddingTop: 8,
      background: 'var(--glass-strong)',
      backdropFilter: 'blur(22px) saturate(150%)', WebkitBackdropFilter: 'blur(22px) saturate(150%)',
      borderTop: '1px solid var(--border-glass)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start',
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const on = tab === id;
        return (
          <Pressable as="button" key={id} onClick={() => setTab(id)} scale={0.9} style={{
            border: 'none', background: 'none', padding: '2px 10px 0', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? 'var(--accent-strong)' : 'var(--text-subtle)', fontFamily: 'var(--font-sans)',
          }}>
            <Icon size={25} stroke={on ? 2 : 1.7} />
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, letterSpacing: '-0.01em' }}>{label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Screen shells
// ══════════════════════════════════════════════════════════
const STATUS_PAD = 56; // clears the status bar / dynamic island

// Tab screen: large title + scroll-aware compact bar + trailing actions.
function Screen({ title, trailing, children, bottomPad = 96, headerExtra }) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface-page)', overflow: 'hidden' }}>
      {/* compact bar overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        paddingTop: STATUS_PAD, height: STATUS_PAD + 46, boxSizing: 'border-box',
        background: scrolled ? 'var(--glass-strong)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-glass)' : '1px solid transparent',
        transition: 'background .25s, border-color .25s', pointerEvents: 'none',
        display: 'flex', alignItems: 'center', padding: `${STATUS_PAD}px 16px 0`,
      }}>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)', opacity: scrolled ? 1 : 0, transition: 'opacity .2s' }}>{title}</div>
        {trailing && <div style={{ position: 'absolute', right: 16, top: STATUS_PAD - 1, display: 'flex', gap: 8, pointerEvents: 'auto' }}>{trailing}</div>}
      </div>
      {/* scroll body */}
      <div onScroll={(e) => setScrolled(e.target.scrollTop > 28)} style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ paddingTop: STATUS_PAD + 6 }}>
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', lineHeight: 1.05 }}>{title}</h1>
          </div>
          {headerExtra}
          <div style={{ paddingBottom: bottomPad }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// Pushed detail screen: back chevron, optional title, custom body. Covers tab bar.
function DetailScreen({ onBack, trailing, children, barTitle, transparentBar = false, dark, bottomBar }) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface-page)', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 25,
        paddingTop: STATUS_PAD, height: STATUS_PAD + 46, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${STATUS_PAD}px 12px 0`,
        background: scrolled ? 'var(--glass-strong)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-glass)' : '1px solid transparent',
        transition: 'background .25s, border-color .25s', pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <IconBtn size={36} icon={<IconChevronLeft size={19} />} onClick={onBack} label="Back" />
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)', opacity: scrolled && barTitle ? 1 : 0, transition: 'opacity .2s', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{barTitle}</div>
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: 8 }}>{trailing || <div style={{ width: 36 }} />}</div>
      </div>
      <div onScroll={(e) => setScrolled(e.target.scrollTop > 24)} style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      {bottomBar}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────
function sumMeal(items) {
  return items.reduce((acc, it) => {
    const r = recipeById(it.recipe); const m = it.servings || 1;
    return { cal: acc.cal + r.cal * m, p: acc.p + r.p * m, c: acc.c + r.c * m, f: acc.f + r.f * m };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}
function sumDay(log) {
  return ['breakfast', 'lunch', 'dinner', 'snack'].reduce((acc, k) => {
    const s = sumMeal(log[k] || []);
    return { cal: acc.cal + s.cal, p: acc.p + s.p, c: acc.c + s.c, f: acc.f + s.f };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}

Object.assign(window, {
  AppCtx, useApp, Pressable, Avatar, IconBtn, MacroDots, TrustBadge, CreatorRow,
  Chip, Segmented, SectionTitle, Eyebrow, DishHeader, Sheet, SheetHost, Toast,
  TabBar, TABS, Screen, DetailScreen, STATUS_PAD, sumMeal, sumDay,
});
