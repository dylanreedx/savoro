/* Savoro · Bottom sheets — Log, Log-pick, Fork, Share, Publish. */
const { useState } = React;

function SheetHeading({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{children}</h2>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</p>}
    </div>
  );
}

function Stepper({ value, onChange }) {
  const btn = (icon, fn, disabled) => (
    <Pressable as="button" onClick={fn} style={{
      width: 40, height: 40, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)',
      color: disabled ? 'var(--text-subtle)' : 'var(--text-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>{icon}</Pressable>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {btn(<IconMinus size={18} stroke={2.2} />, () => onChange(Math.max(0.5, +(value - 0.5).toFixed(1))))}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginLeft: 6 }}>serving{value === 1 ? '' : 's'}</span>
      </div>
      {btn(<IconPlus size={18} stroke={2.2} />, () => onChange(+(value + 0.5).toFixed(1)))}
    </div>
  );
}

// ── Log a specific recipe ────────────────────────────────
function LogSheet({ recipe, meal: presetMeal }) {
  const app = useApp();
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState(presetMeal || guessMeal());
  const m = { cal: Math.round(recipe.cal * servings), p: Math.round(recipe.p * servings), c: Math.round(recipe.c * servings), f: Math.round(recipe.f * servings) };
  return (
    <div>
      <SheetHeading>Log this recipe</SheetHeading>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius-card)', background: 'var(--surface-raised)', marginBottom: 18 }}>
        <div style={{ width: 54, height: 54, borderRadius: 13, background: recipe.grad, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{recipe.title}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Logged from latest version · @{USERS[recipe.creator]?.handle || ME.handle}</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Eyebrow style={{ marginBottom: 10 }}>Serving amount</Eyebrow>
        <Stepper value={servings} onChange={setServings} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[0.5, 1, 1.5, 2].map((v) => (
            <Pressable as="button" key={v} onClick={() => setServings(v)} style={{ flex: 1, padding: '8px 0', borderRadius: 9999, border: `1px solid ${servings === v ? 'var(--sand-900)' : 'var(--border)'}`, background: servings === v ? 'var(--sand-900)' : 'transparent', color: servings === v ? 'var(--sand-50)' : 'var(--text-body)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{v}×</Pressable>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Eyebrow style={{ marginBottom: 10 }}>Meal</Eyebrow>
        <Segmented options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' }]} value={meal} onChange={setMeal} />
      </div>

      <Pressable as="button" onClick={() => app.openSheet(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 'var(--radius-card)', background: 'var(--surface-raised)', border: 'none', cursor: 'pointer', marginBottom: 18, fontFamily: 'var(--font-sans)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-body)' }}><IconCalendar size={17} />Today</span>
        <IconChevronRight size={16} style={{ color: 'var(--text-subtle)' }} />
      </Pressable>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 16px' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Adds to today</span>
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{m.cal} cal · {m.p}g P</span>
      </div>

      <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={() => { app.logRecipe(recipe, servings, meal); }}>Log this serving</Button>
      <p style={{ margin: '12px 4px 0', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', textAlign: 'center', display: 'inline-flex', gap: 5, alignItems: 'center', justifyContent: 'center', width: '100%' }}><IconLock size={12} />Your logs stay private.</p>
    </div>
  );
}

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

// ── Pick a recipe to log ─────────────────────────────────
function LogPickSheet({ meal }) {
  const app = useApp();
  const [q, setQ] = useState('');
  const list = RECIPES.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <SheetHeading sub="Logging a recipe is faster than tracking each food.">Log a recipe</SheetHeading>
      <div style={{ marginBottom: 16 }}>
        <Input icon={<IconSearch size={17} />} placeholder="Search your recipes & food" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Eyebrow style={{ marginBottom: 10 }}>From your cookbook</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {list.map((r) => (
          <RecipeRow key={r.id} recipe={r} onClick={() => app.openSheet({ type: 'log', recipe: r, meal })}
            trailing={<PillBtn variant="dark" onClick={() => app.openSheet({ type: 'log', recipe: r, meal })} icon={<IconPlus size={13} stroke={2.4} />}>Log</PillBtn>} />
        ))}
      </div>
    </div>
  );
}

// ── Fork / remix ─────────────────────────────────────────
function ForkSheet({ recipe }) {
  const app = useApp();
  const orig = USERS[recipe.creator]?.handle || ME.handle;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '6px auto 14px' }}>
        <IconFork size={30} />
      </div>
      <SheetHeading>Make your version</SheetHeading>
      <p style={{ margin: '-8px 8px 20px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>
        We'll save a private, editable copy of <b style={{ color: 'var(--text-body)' }}>{recipe.title}</b> to your Cookbook. Tweak the ingredients and servings — macros update as you go.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 12, borderRadius: 'var(--radius-card)', background: 'var(--surface-raised)', marginBottom: 20, textAlign: 'left' }}>
        <Avatar user={recipe.creator} size={28} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Remix from <b style={{ color: 'var(--text-body)' }}>@{orig}</b>'s original. We'll always credit them.</span>
      </div>
      <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={() => app.forkRecipe(recipe)}>Fork to my Cookbook</Button>
      <button onClick={() => app.openSheet(null)} style={{ marginTop: 12, width: '100%', border: 'none', background: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Not now</button>
    </div>
  );
}

// ── Share ────────────────────────────────────────────────
function ShareRow({ icon, title, sub, onClick, accent }) {
  return (
    <Pressable as="button" onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: accent ? 'var(--accent-soft)' : 'var(--surface-raised)', color: accent ? 'var(--accent-strong)' : 'var(--text-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{title}</div>
        {sub && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <IconChevronRight size={16} style={{ color: 'var(--text-subtle)' }} />
    </Pressable>
  );
}

function ShareSheet({ recipe, fromPublish }) {
  const app = useApp();
  const [stage, setStage] = useState('menu'); // menu | community
  const [caption, setCaption] = useState('');
  const [picked, setPicked] = useState(null);

  if (stage === 'community') {
    return (
      <div>
        <SheetHeading sub="Your recipe appears in the community feed. Publishing shares the recipe, not your daily log.">Share to a community</SheetHeading>
        <Eyebrow style={{ marginBottom: 10 }}>Your communities</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {COMMUNITIES.slice(0, 3).map((c) => (
            <Pressable as="button" key={c.id} onClick={() => setPicked(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, borderRadius: 'var(--radius-card)', border: `1px solid ${picked === c.id ? 'var(--accent-strong)' : 'var(--border-glass)'}`, background: picked === c.id ? 'var(--accent-soft)' : 'var(--surface-card-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: c.grad, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{c.name}</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.members.toLocaleString()} members</div>
              </div>
              {picked === c.id && <span style={{ color: 'var(--accent-strong)' }}><IconCheck size={20} /></span>}
            </Pressable>
          ))}
        </div>
        <Eyebrow style={{ marginBottom: 8 }}>Caption (optional)</Eyebrow>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something about this recipe…" rows={2} style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '12px 14px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)', background: 'var(--surface-card-strong)', outline: 'none', marginBottom: 16 }} />
        <Button variant="primary" size="lg" style={{ width: '100%', opacity: picked ? 1 : 0.5, pointerEvents: picked ? 'auto' : 'none' }} onClick={() => app.shareToCommunity(recipe, communityById(picked))}>Share to {picked ? communityById(picked).name : 'community'}</Button>
        <button onClick={() => setStage('menu')} style={{ marginTop: 12, width: '100%', border: 'none', background: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Back</button>
      </div>
    );
  }

  return (
    <div>
      <SheetHeading>{fromPublish ? 'Recipe saved — share it?' : 'Share recipe'}</SheetHeading>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius-card)', background: 'var(--surface-raised)', marginBottom: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: recipe.grad, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{recipe.title}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <ShareRow accent icon={<IconUsers size={20} />} title="Share to a community" sub="Post to a recipe feed you've joined" onClick={() => setStage('community')} />
        <ShareRow icon={<IconSend size={19} />} title="Send to a friend" sub="Share directly in a message" onClick={() => app.confirmShare('Sent to a friend')} />
        <ShareRow icon={<IconGlobe size={19} />} title="Publish to profile" sub="Adds to your public recipes" onClick={() => app.confirmShare('Published to your profile')} />
        <ShareRow icon={<IconLink size={19} />} title="Copy public link" sub="Anyone can view & log it" onClick={() => app.confirmShare('Public link copied')} />
      </div>
      <p style={{ margin: '16px 4px 0', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', textAlign: 'center', display: 'inline-flex', gap: 5, alignItems: 'center', justifyContent: 'center', width: '100%' }}><IconLock size={12} />Publishing shares the recipe, not your daily log.</p>
    </div>
  );
}

// ── Publish (after creating) ─────────────────────────────
function PublishSheet({ recipe }) {
  const app = useApp();
  const [choice, setChoice] = useState('private');
  const opts = [
    { id: 'private', icon: <IconLock size={19} />, title: 'Keep private', sub: 'Only you can see it' },
    { id: 'unlisted', icon: <IconLink size={19} />, title: 'Unlisted link', sub: 'Anyone with the link' },
    { id: 'profile', icon: <IconGlobe size={19} />, title: 'Publish to profile', sub: 'Show on your public profile' },
    { id: 'community', icon: <IconUsers size={19} />, title: 'Share to a community', sub: 'Post to a recipe feed' },
  ];
  return (
    <div>
      <SheetHeading sub="You can change this anytime. Your daily log always stays private.">Save & share</SheetHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
        {opts.map((o) => (
          <Pressable as="button" key={o.id} onClick={() => setChoice(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 'var(--radius-card)', border: `1px solid ${choice === o.id ? 'var(--accent-strong)' : 'var(--border-glass)'}`, background: choice === o.id ? 'var(--accent-soft)' : 'var(--surface-card-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: choice === o.id ? 'var(--surface-card-strong)' : 'var(--surface-raised)', color: choice === o.id ? 'var(--accent-strong)' : 'var(--text-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{o.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{o.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{o.sub}</div>
            </div>
            <span style={{ width: 20, height: 20, borderRadius: 9999, border: `2px solid ${choice === o.id ? 'var(--accent-strong)' : 'var(--border-strong)'}`, background: choice === o.id ? 'var(--accent-strong)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{choice === o.id && <span style={{ width: 7, height: 7, borderRadius: 9999, background: 'var(--sand-50)' }} />}</span>
          </Pressable>
        ))}
      </div>
      <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={() => app.finishPublish(choice)}>Done</Button>
    </div>
  );
}

function renderSheet(active) {
  switch (active.type) {
    case 'log': return <LogSheet recipe={active.recipe} meal={active.meal} />;
    case 'logpick': return <LogPickSheet meal={active.meal} />;
    case 'fork': return <ForkSheet recipe={active.recipe} />;
    case 'share': return <ShareSheet recipe={active.recipe} fromPublish={active.fromPublish} />;
    case 'publish': return <PublishSheet recipe={active.recipe} />;
    default: return null;
  }
}

Object.assign(window, { renderSheet, LogSheet, LogPickSheet, ForkSheet, ShareSheet, PublishSheet });
