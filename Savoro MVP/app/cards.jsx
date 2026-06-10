/* Savoro · Reusable cards — recipe / community / feed. */

// Small pill action button used on cards & clusters
function PillBtn({ children, onClick, variant = 'soft', icon, full, size = 'sm' }) {
  const pad = size === 'sm' ? '8px 14px' : '11px 18px';
  const fs = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  const variants = {
    dark: { background: 'var(--sand-900)', color: 'var(--sand-50)', border: '1px solid transparent' },
    soft: { background: 'var(--glass-strong)', color: 'var(--text-strong)', border: '1px solid var(--border)' },
    sage: { background: 'var(--positive-soft)', color: 'var(--positive)', border: '1px solid var(--sage-200)' },
    blush: { background: 'var(--accent-soft)', color: 'var(--accent-strong)', border: '1px solid var(--blush-200)' },
    ghost: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent' },
  };
  return (
    <Pressable as="button" onClick={(e) => { e.stopPropagation?.(); onClick && onClick(e); }} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      flex: full ? 1 : undefined, padding: pad, borderRadius: 9999, fontSize: fs,
      fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      boxShadow: variant === 'dark' ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap', ...variants[variant],
    }}>{icon}{children}</Pressable>
  );
}

// Save (bookmark) toggle — reads app state
function SaveBtn({ recipe, floating }) {
  const app = useApp();
  const saved = app.isSaved(recipe.id);
  if (floating) {
    return (
      <Pressable as="button" onClick={(e) => { e.stopPropagation(); app.toggleSave(recipe); }} style={{
        width: 34, height: 34, borderRadius: 9999, border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--glass-strong)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        color: saved ? 'var(--accent-strong)' : 'var(--text-body)', boxShadow: 'var(--shadow-sm)',
      }}>
        <IconBookmark size={17} fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent-strong)' : 'currentColor'} />
      </Pressable>
    );
  }
  return (
    <PillBtn variant={saved ? 'blush' : 'soft'} onClick={() => app.toggleSave(recipe)}
      icon={<IconBookmark size={14} fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent-strong)' : 'currentColor'} />}>
      {saved ? 'Saved' : 'Save'}
    </PillBtn>
  );
}

// Save / Log (+ optional Fork) cluster
function ActionCluster({ recipe, showFork }) {
  const app = useApp();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <SaveBtn recipe={recipe} />
      {showFork && <PillBtn variant="soft" icon={<IconFork size={14} />} onClick={() => app.openSheet({ type: 'fork', recipe })}>Fork</PillBtn>}
      <PillBtn variant="dark" full icon={<IconPlus size={14} stroke={2.2} />} onClick={() => app.openSheet({ type: 'log', recipe })}>Log</PillBtn>
    </div>
  );
}

// ── Large recipe card (gradient header) ──────────────────
function RecipeCardLarge({ recipe, width, context, actions = true }) {
  const app = useApp();
  const u = USERS[recipe.creator];
  return (
    <Pressable onClick={() => app.openRecipe(recipe)} style={{
      width, flexShrink: 0, overflow: 'hidden', borderRadius: 'var(--radius-glass)',
      background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)',
    }}>
      <DishHeader recipe={recipe} height={138}>
        <div style={{ position: 'absolute', top: 10, right: 10 }}><SaveBtn recipe={recipe} floating /></div>
        <div style={{ position: 'absolute', left: 10, bottom: 10, display: 'flex', gap: 6 }}>
          {recipe.tags.slice(0, 2).map((t) => (
            <span key={t} style={{ borderRadius: 9999, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '4px 10px', fontSize: 'var(--text-2xs)', fontWeight: 600, color: 'var(--sand-800)' }}>{t}</span>
          ))}
        </div>
      </DishHeader>
      <div style={{ padding: 14 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.2 }}>{recipe.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
          <Avatar user={u} size={20} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>@{u.handle}</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--text-subtle)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</span>
        </div>
        {context && (
          <div style={{ marginTop: 9, fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {context.icon}{context.label}
          </div>
        )}
        {actions && <div style={{ marginTop: 12 }}><ActionCluster recipe={recipe} /></div>}
      </div>
    </Pressable>
  );
}

// ── Compact recipe row (thumb + meta) ────────────────────
function RecipeRow({ recipe, context, trailing, onClick }) {
  const app = useApp();
  const u = USERS[recipe.creator];
  return (
    <Pressable onClick={onClick || (() => app.openRecipe(recipe))} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: 10,
      borderRadius: 'var(--radius-card)', background: 'var(--surface-card-strong)',
      border: '1px solid var(--border-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)',
    }}>
      <div style={{ position: 'relative', width: 62, height: 62, borderRadius: 14, background: recipe.grad, flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 60%)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.title}</div>
        <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g P · {recipe.c}g C · {recipe.f}g F</div>
        {context ? (
          <div style={{ marginTop: 4, fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}>{context.icon}{context.label}</div>
        ) : (
          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar user={u} size={16} radius={5} />
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)', fontWeight: 600 }}>@{u.handle}</span>
          </div>
        )}
      </div>
      {trailing !== undefined ? trailing : <IconChevronRight size={17} style={{ color: 'var(--text-subtle)' }} />}
    </Pressable>
  );
}

// ── Mini tile for dense horizontal rails ─────────────────
function RecipeTileMini({ recipe, width = 150 }) {
  const app = useApp();
  return (
    <Pressable onClick={() => app.openRecipe(recipe)} style={{ width, flexShrink: 0 }}>
      <div style={{ position: 'relative', height: 104, borderRadius: 16, background: recipe.grad, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8 }}><SaveBtn recipe={recipe} floating /></div>
      </div>
      <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)', lineHeight: 1.2 }}>{recipe.title}</div>
      <div style={{ marginTop: 3, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</div>
    </Pressable>
  );
}

// ── Community card ───────────────────────────────────────
function CommunityCard({ community, joined, onOpen }) {
  const app = useApp();
  return (
    <Pressable onClick={onOpen || (() => app.openCommunity(community))} style={{
      overflow: 'hidden', borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)',
      border: '1px solid var(--border-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)',
    }}>
      <div style={{ height: 76, background: community.grad, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 25% 30%, rgba(255,255,255,0.4), transparent 60%)' }} />
      </div>
      <div style={{ padding: 13 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>{community.name}</div>
        <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{community.members.toLocaleString()} members · {community.recipes} recipes</div>
      </div>
    </Pressable>
  );
}

// ── Community feed item (shared recipe) ──────────────────
function FeedItem({ activity }) {
  const app = useApp();
  const r = recipeById(activity.recipe);
  const u = USERS[activity.user];
  const com = activity.community ? communityById(activity.community) : null;
  return (
    <div style={{
      borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)',
      border: '1px solid var(--border-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px 10px' }}>
        <Avatar user={u} size={30} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.35 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>@{u.handle}</span> {activity.verb}{' '}
          <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{r.title}</span>
          {com && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', marginTop: 1 }}>in {com.name} · {activity.when} ago</div>}
        </div>
      </div>
      <Pressable onClick={() => app.openRecipe(r)} style={{ margin: '0 14px', position: 'relative', height: 132, borderRadius: 14, background: r.grad, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 28% 32%, rgba(255,255,255,0.4), transparent 58%)' }} />
        <div style={{ position: 'absolute', left: 12, bottom: 12 }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--sand-900)', textShadow: '0 1px 12px rgba(255,255,255,0.5)' }}>{r.title}</div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--sand-800)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{r.cal} cal · {r.p}g protein</div>
        </div>
      </Pressable>
      <div style={{ display: 'flex', gap: 8, padding: 14 }}>
        <SaveBtn recipe={r} />
        <PillBtn variant="soft" icon={<IconFork size={14} />} onClick={() => app.openSheet({ type: 'fork', recipe: r })}>Fork</PillBtn>
        <PillBtn variant="dark" full icon={<IconPlus size={14} stroke={2.2} />} onClick={() => app.openSheet({ type: 'log', recipe: r })}>Log</PillBtn>
      </div>
    </div>
  );
}

// ── Friend activity line (compact) ───────────────────────
function ActivityRow({ activity }) {
  const app = useApp();
  const r = recipeById(activity.recipe);
  const u = USERS[activity.user];
  const verbColor = { published: 'var(--accent-strong)', forked: 'var(--macro-fat)', saved: 'var(--positive)', shared: 'var(--text-body)' };
  return (
    <Pressable onClick={() => app.openRecipe(r)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 4px' }}>
      <Avatar user={u} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.3 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>@{u.handle}</span>{' '}
          <span style={{ fontWeight: 600, color: verbColor[activity.verb] }}>{activity.verb}</span>{' '}
          <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{r.title}</span>
        </div>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)', marginTop: 2 }}>{activity.when} ago</div>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: r.grad, flexShrink: 0 }} />
    </Pressable>
  );
}

Object.assign(window, {
  PillBtn, SaveBtn, ActionCluster, RecipeCardLarge, RecipeRow, RecipeTileMini,
  CommunityCard, FeedItem, ActivityRow,
});
