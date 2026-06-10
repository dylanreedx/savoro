/* Savoro · Recipe detail — premium, food-first, sticky Save/Fork/Log. */
const { useState } = React;

function MacroStat({ label, value, unit, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}<span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-muted)' }}>{unit}</span></div>
      <div style={{ marginTop: 6, fontSize: 'var(--text-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: 9999, background: color }} />{label}
      </div>
    </div>
  );
}

function IngredientRow({ ing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{ing.name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{ing.amount}{ing.source === 'usda' ? ' · USDA' : ing.source === 'label' ? ' · Label' : ''}</div>
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-body)' }}>{ing.cal} cal</div>
        <div style={{ marginTop: 1 }}>{ing.p}P · {ing.c}C · {ing.f}F</div>
      </div>
    </div>
  );
}

function StepRow({ n, text }) {
  return (
    <div style={{ display: 'flex', gap: 13, padding: '4px 0 16px' }}>
      <div style={{ width: 28, height: 28, borderRadius: 9999, background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--text-sm)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
      <div style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.55, paddingTop: 3 }}>{text}</div>
    </div>
  );
}

function RecipeDetail({ recipe, forkedFrom }) {
  const app = useApp();
  const [servings, setServings] = useState(recipe.servings);
  const factor = servings / recipe.servings;
  const sc = (n) => Math.round(n * factor);
  const u = USERS[recipe.creator] || ME;
  const com = recipe.community ? COMMUNITIES.find((c) => c.name === recipe.community) : null;
  const saved = app.isSaved(recipe.id);

  const bottomBar = (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 22px))', background: 'var(--glass-strong)', backdropFilter: 'blur(22px) saturate(150%)', WebkitBackdropFilter: 'blur(22px) saturate(150%)', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: 10 }}>
      <Pressable as="button" onClick={() => app.toggleSave(recipe)} style={{ width: 52, flexShrink: 0, borderRadius: 9999, border: '1px solid var(--border)', background: saved ? 'var(--accent-soft)' : 'var(--surface-card-strong)', color: saved ? 'var(--accent-strong)' : 'var(--text-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <IconBookmark size={20} fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent-strong)' : 'currentColor'} />
      </Pressable>
      <Pressable as="button" onClick={() => app.openSheet({ type: 'fork', recipe })} style={{ width: 52, flexShrink: 0, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)', color: 'var(--text-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <IconFork size={19} />
      </Pressable>
      <Button variant="primary" size="lg" style={{ flex: 1 }} iconLeft={<IconPlus size={17} stroke={2.2} />} onClick={() => app.openSheet({ type: 'log', recipe })}>Log this</Button>
    </div>
  );

  return (
    <DetailScreen onBack={app.back} barTitle={recipe.title} transparentBar
      trailing={<IconBtn size={36} icon={<IconShare size={18} />} onClick={() => app.openSheet({ type: 'share', recipe })} label="Share" />}
      bottomBar={bottomBar}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 320, background: recipe.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.45) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, var(--surface-page) 100%)' }} />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {recipe.tags.map((t) => <span key={t} style={{ borderRadius: 9999, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '5px 12px', fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--sand-800)' }}>{t}</span>)}
          </div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--sand-900)', lineHeight: 1.05, textShadow: '0 1px 16px rgba(255,255,255,0.45)' }}>{recipe.title}</h1>
        </div>
      </div>

      <div style={{ padding: '4px 16px 0' }}>
        {/* Creator + trust */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <Pressable onClick={() => app.openProfile(recipe.creator)} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Avatar user={u} size={36} />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>@{u.handle}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Updated {recipe.updated}</div>
            </div>
          </Pressable>
          <TrustBadge source={recipe.source} size="md" />
        </div>

        {forkedFrom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 'var(--radius-card)', background: 'var(--accent-soft)', marginBottom: 16 }}>
            <IconFork size={15} style={{ color: 'var(--accent-strong)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-strong)', fontWeight: 600 }}>Your private remix from @{USERS[forkedFrom]?.handle}'s original</span>
          </div>
        )}

        {/* Macro summary */}
        <div style={{ padding: 16, borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>Macros per serving</span>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{sc(recipe.cal)} cal</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <MacroStat label="Protein" value={sc(recipe.p)} unit="g" color="var(--macro-protein)" />
            <div style={{ width: 1, background: 'var(--border)' }} />
            <MacroStat label="Carbs" value={sc(recipe.c)} unit="g" color="var(--macro-carbs)" />
            <div style={{ width: 1, background: 'var(--border)' }} />
            <MacroStat label="Fat" value={sc(recipe.f)} unit="g" color="var(--macro-fat)" />
          </div>
          <MacroBar protein={sc(recipe.p)} carbs={sc(recipe.c)} fat={sc(recipe.f)} legend={false} height={8} />
          {/* Serving selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-body)' }}>Servings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Pressable as="button" onClick={() => setServings(Math.max(1, servings - 1))} style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)', color: 'var(--text-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IconMinus size={16} stroke={2.2} /></Pressable>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'center' }}>{servings}</span>
              <Pressable as="button" onClick={() => setServings(servings + 1)} style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)', color: 'var(--text-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IconPlus size={16} stroke={2.2} /></Pressable>
            </div>
          </div>
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 'var(--text-base)', color: 'var(--text-body)', lineHeight: 1.6 }}>{recipe.blurb}</p>

        {/* meta */}
        <div style={{ display: 'flex', gap: 18, marginTop: 16, padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><IconClock size={17} style={{ color: 'var(--text-muted)' }} /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', fontWeight: 600 }}>{recipe.time}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><IconCookbook size={16} style={{ color: 'var(--text-muted)' }} /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', fontWeight: 600 }}>{recipe.ingredients.length} ingredients</span></div>
        </div>

        {/* Ingredients */}
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Ingredients</SectionTitle>
          <div style={{ marginTop: 6 }}>
            {recipe.ingredients.map((ing, i) => <IngredientRow key={i} ing={ing} />)}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: 24 }}>
          <SectionTitle>Instructions</SectionTitle>
          <div style={{ marginTop: 12 }}>
            {recipe.steps.map((s, i) => <StepRow key={i} n={i + 1} text={s} />)}
          </div>
        </div>

        {/* Social context */}
        <div style={{ marginTop: 18, padding: 16, borderRadius: 'var(--radius-glass)', background: 'var(--surface-raised)' }}>
          <Eyebrow style={{ marginBottom: 12 }}>In the community</Eyebrow>
          {com && (
            <Pressable onClick={() => app.openCommunity(com)} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: recipe.savedByFriends ? 14 : 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: com.grad, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>Popular in {com.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{com.members.toLocaleString()} members</div>
              </div>
              <IconChevronRight size={17} style={{ color: 'var(--text-subtle)' }} />
            </Pressable>
          )}
          {recipe.savedByFriends > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {['maya', 'alex', 'jordan'].slice(0, Math.min(3, recipe.savedByFriends)).map((h, i) => (
                  <div key={h} style={{ marginLeft: i ? -8 : 0, borderRadius: 9, border: '2px solid var(--surface-raised)' }}><Avatar user={h} size={26} radius={7} /></div>
                ))}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Saved by <b style={{ color: 'var(--text-strong)' }}>{recipe.savedByFriends} friends</b></span>
            </div>
          )}
        </div>

        <div style={{ height: 110 }} />
      </div>
    </DetailScreen>
  );
}

Object.assign(window, { RecipeDetail });
