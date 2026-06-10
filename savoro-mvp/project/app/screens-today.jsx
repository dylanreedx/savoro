/* Savoro · Today tab — private daily dashboard. 3 hero/layout variations. */

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Non-shaming remaining-calorie phrasing
function remainingCopy(total, goal) {
  const left = goal - total;
  if (left >= 0) return { big: left.toLocaleString(), sub: 'cal still flexible' };
  return { big: Math.abs(left).toLocaleString(), sub: 'cal over plan — all good' };
}

// ── Macro progress bar (goal-relative) ───────────────────
function GoalBar({ label, cur, goal, color }) {
  const pct = Math.min(cur / goal, 1) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(cur)} / {goal}g</span>
      </div>
      <div style={{ height: 7, borderRadius: 9999, background: 'var(--sand-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', borderRadius: 9999, background: color, transition: 'width .7s var(--ease-out)' }} />
      </div>
    </div>
  );
}

// ── Quick actions row ────────────────────────────────────
function QuickActions({ variant }) {
  const app = useApp();
  const acts = [
    { label: 'Log recipe', icon: <IconCookbook size={18} />, onClick: () => app.openSheet({ type: 'logpick' }) },
    { label: 'Log food', icon: <IconPlus size={18} stroke={2.2} />, onClick: () => app.openSheet({ type: 'logpick' }) },
    { label: 'Search', icon: <IconSearch size={17} />, onClick: () => app.setTab('discover') },
  ];
  if (variant === 'links') {
    return (
      <div style={{ display: 'flex', gap: 18, padding: '0 16px' }}>
        {acts.map((a) => (
          <Pressable as="button" key={a.label} onClick={a.onClick} style={{ border: 'none', background: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--accent-strong)', fontWeight: 700, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            {a.icon}{a.label}
          </Pressable>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, padding: '0 16px' }}>
      {acts.map((a) => (
        <Pressable as="button" key={a.label} onClick={a.onClick} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 6px',
          borderRadius: 'var(--radius-card)', border: '1px solid var(--border-glass)',
          background: 'var(--surface-card-strong)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          color: 'var(--text-strong)',
        }}>
          <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent-strong)', alignItems: 'center', justifyContent: 'center' }}>{a.icon}</span>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{a.label}</span>
        </Pressable>
      ))}
    </div>
  );
}

// ── A logged meal section ────────────────────────────────
function MealSection({ meal, items, timeline }) {
  const app = useApp();
  const s = sumMeal(items);
  return (
    <div style={{ marginBottom: timeline ? 0 : 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {timeline && <span style={{ width: 9, height: 9, borderRadius: 9999, background: items.length ? 'var(--accent)' : 'var(--sand-300)', boxShadow: items.length ? '0 0 0 3px var(--accent-soft)' : 'none' }} />}
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{meal.label}</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{items.length ? `${Math.round(s.cal)} cal · ${Math.round(s.p)}g P` : ''}</span>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => {
          const r = recipeById(it.recipe);
          return <RecipeRow key={i} recipe={r} trailing={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>{it.servings > 1 ? `${it.servings}×` : ''}</span>} />;
        })}
        <Pressable as="button" onClick={() => app.openSheet({ type: 'logpick', meal: meal.key })} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 'var(--radius-card)',
          border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)',
          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600,
        }}>
          <IconPlus size={16} stroke={2} /> Log {meal.label.toLowerCase()}
        </Pressable>
      </div>
    </div>
  );
}

function MealsList({ log, timeline }) {
  if (timeline) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 36, top: 14, bottom: 30, width: 2, background: 'var(--border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {MEALS.map((m) => <MealSection key={m.key} meal={m} items={log[m.key] || []} timeline />)}
        </div>
      </div>
    );
  }
  return <div>{MEALS.map((m) => <MealSection key={m.key} meal={m} items={log[m.key] || []} />)}</div>;
}

// ── Recently saved rail ──────────────────────────────────
function RecentRail() {
  const app = useApp();
  const recents = ['oats', 'turkey', 'pancakes', 'poke'].map(recipeById);
  return (
    <div>
      <SectionTitle style={{ padding: '0 16px', marginBottom: 12 }} action="Cookbook" onAction={() => app.setTab('cookbook')}>Log again</SectionTitle>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
        {recents.map((r) => <RecipeTileMini key={r.id} recipe={r} width={150} />)}
      </div>
    </div>
  );
}

function DayMeta() {
  const d = new Date();
  return <span>{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>;
}

// ══════════════════════════════════════════════════════════
//  Variation 1 — Ring + goal bars hero
// ══════════════════════════════════════════════════════════
function TodayHeroRings({ total }) {
  const rc = remainingCopy(total.cal, GOALS.cal);
  return (
    <div style={{ margin: '0 16px', padding: 18, borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>Today so far</span>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconLock size={12} />Private</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <CalorieRing current={Math.round(total.cal)} goal={GOALS.cal} size={104} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <GoalBar label="Protein" cur={total.p} goal={GOALS.p} color="var(--macro-protein)" />
          <GoalBar label="Carbs" cur={total.c} goal={GOALS.c} color="var(--macro-carbs)" />
          <GoalBar label="Fat" cur={total.f} goal={GOALS.f} color="var(--macro-fat)" />
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{rc.big}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{rc.sub}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Variation 2 — Stat tiles hero
// ══════════════════════════════════════════════════════════
function StatTile({ label, cur, goal, unit, color }) {
  const pct = Math.min(cur / goal, 1) * 100;
  return (
    <div style={{ padding: 13, borderRadius: 'var(--radius-card)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
      <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '6px 0 9px' }}>
        <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{Math.round(cur)}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>/{goal}{unit}</span>
      </div>
      <div style={{ height: 5, borderRadius: 9999, background: 'var(--sand-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', borderRadius: 9999, background: color, transition: 'width .7s var(--ease-out)' }} />
      </div>
    </div>
  );
}
function TodayHeroTiles({ total }) {
  return (
    <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
      <StatTile label="Calories" cur={total.cal} goal={GOALS.cal} unit="" color="var(--macro-calories)" />
      <StatTile label="Protein" cur={total.p} goal={GOALS.p} unit="g" color="var(--macro-protein)" />
      <StatTile label="Carbs" cur={total.c} goal={GOALS.c} unit="g" color="var(--macro-carbs)" />
      <StatTile label="Fat" cur={total.f} goal={GOALS.f} unit="g" color="var(--macro-fat)" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Variation 3 — Minimal big-number hero
// ══════════════════════════════════════════════════════════
function TodayHeroMinimal({ total }) {
  const pct = Math.min(total.cal / GOALS.cal, 1) * 100;
  const macroTotal = total.p + total.c + total.f || 1;
  const segs = [['var(--macro-protein)', total.p, 'Protein'], ['var(--macro-carbs)', total.c, 'Carbs'], ['var(--macro-fat)', total.f, 'Fat']];
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 0.95 }}>{Math.round(total.cal).toLocaleString()}</span>
        <span style={{ fontSize: 'var(--text-lg)', color: 'var(--text-subtle)', fontWeight: 600, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>/ {GOALS.cal.toLocaleString()} cal</span>
      </div>
      <div style={{ marginTop: 14, height: 8, borderRadius: 9999, background: 'var(--sand-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', borderRadius: 9999, background: 'linear-gradient(90deg, var(--blush-300), var(--blush-400))', transition: 'width .7s var(--ease-out)' }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', height: 9, borderRadius: 9999, overflow: 'hidden', background: 'var(--sand-200)' }}>
          {segs.map(([col, v]) => <div key={col} style={{ width: `${(v / macroTotal) * 100}%`, background: col, transition: 'width .7s var(--ease-out)' }} />)}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 9 }}>
          {segs.map(([col, v, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: col }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{l}</span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(v)}g</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Today screen (switches by layout tweak)
// ══════════════════════════════════════════════════════════
function TodayScreen({ layout }) {
  const app = useApp();
  const total = sumDay(app.log);
  const trailing = (
    <>
      <IconBtn size={36} icon={<IconBell size={19} />} onClick={() => {}} label="Notifications" />
      <IconBtn size={36} icon={<IconPlus size={20} stroke={2.2} />} onClick={() => app.openSheet({ type: 'logpick' })} label="Log" />
    </>
  );
  const subtitle = (
    <div style={{ padding: '4px 16px 0' }}>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>{greeting()}, {ME.name.split(' ')[0]} · <DayMeta /></div>
    </div>
  );

  return (
    <Screen title="Today" trailing={trailing} headerExtra={subtitle}>
      <div style={{ marginTop: 16 }}>
        {layout === 'tiles' && <TodayHeroTiles total={total} />}
        {layout === 'minimal' && <TodayHeroMinimal total={total} />}
        {layout === 'rings' && <TodayHeroRings total={total} />}
      </div>

      <div style={{ marginTop: 20 }}>
        {layout === 'minimal' ? <QuickActions variant="links" /> : <QuickActions />}
      </div>

      {layout === 'tiles' && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle style={{ padding: '0 16px', marginBottom: 11 }}>Quick log</SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px' }}>
            <QuickLogChip emoji="☕" name="Coffee" calories={5} />
            <QuickLogChip emoji="🥚" name="2 Eggs" calories={140} />
            <QuickLogChip emoji="🍗" name="Chicken" calories={165} />
            <QuickLogChip emoji="🥛" name="Yogurt" calories={130} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <SectionTitle style={{ padding: '0 16px', marginBottom: 14 }}>Logged meals</SectionTitle>
        <MealsList log={app.log} timeline={layout === 'minimal'} />
      </div>

      <div style={{ marginTop: 26 }}>
        <RecentRail />
      </div>
    </Screen>
  );
}

Object.assign(window, { TodayScreen });
