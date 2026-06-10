/* Savoro · Cookbook (Mine / Saved / Drafts) + Recipe editor. */
const { useState } = React;

const EDITOR_FOODS = [
  { name: 'Chicken breast, grilled', amount: '100 g', cal: 165, p: 31, c: 0, f: 3.6, source: 'usda' },
  { name: 'Brown rice, cooked', amount: '1 cup', cal: 215, p: 5, c: 45, f: 1.8, source: 'usda' },
  { name: 'Avocado', amount: '100 g', cal: 160, p: 2, c: 9, f: 15, source: 'usda' },
  { name: 'Greek yogurt, 2%', amount: '170 g', cal: 130, p: 17, c: 8, f: 3.5, source: 'usda' },
  { name: 'Egg, large', amount: '1', cal: 70, p: 6, c: 0.4, f: 5, source: 'usda' },
  { name: 'Rolled oats', amount: '50 g', cal: 190, p: 7, c: 33, f: 3.4, source: 'usda' },
  { name: 'Olive oil', amount: '1 tbsp', cal: 120, p: 0, c: 0, f: 14, source: 'usda' },
  { name: 'Black beans', amount: '1 cup', cal: 227, p: 15, c: 41, f: 0.9, source: 'usda' },
  { name: 'Sweet potato', amount: '150 g', cal: 130, p: 2, c: 30, f: 0.2, source: 'usda' },
];

// ── Cookbook recipe card (with state badges) ─────────────
function CookbookCard({ recipe, kind }) {
  const app = useApp();
  const u = USERS[recipe.creator];
  const isMine = recipe.creator === ME.handle;
  return (
    <Pressable onClick={() => app.openRecipe(recipe)} style={{ borderRadius: 'var(--radius-glass)', overflow: 'hidden', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
      <div style={{ position: 'relative', height: 110, background: recipe.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.42), transparent 58%)' }} />
        {kind === 'saved' && <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', padding: '4px 9px', fontSize: 9, fontWeight: 700, color: 'var(--accent-strong)' }}><IconBookmark size={11} fill="var(--accent)" stroke="var(--accent-strong)" />Saved</span>}
        {kind === 'draft' && <span style={{ position: 'absolute', top: 8, left: 8, borderRadius: 9999, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', padding: '4px 9px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>Draft</span>}
      </div>
      <div style={{ padding: 11 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)', lineHeight: 1.2 }}>{recipe.title}</div>
        <div style={{ marginTop: 6, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</div>
        {kind === 'saved' && !isMine && <div style={{ marginTop: 6, fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)' }}>Saved from @{u.handle}</div>}
      </div>
    </Pressable>
  );
}

function CookbookScreen() {
  const app = useApp();
  const [tab, setTab] = useState('mine');
  const mine = ME.myRecipeIds.map(recipeById);
  const saved = app.savedList().map(recipeById).filter(Boolean);
  const drafts = ME.draftIds.map(recipeById);
  const set = tab === 'mine' ? mine : tab === 'saved' ? saved : drafts;
  const kind = tab === 'saved' ? 'saved' : tab === 'drafts' ? 'draft' : 'mine';

  const trailing = <IconBtn size={36} icon={<IconPlus size={20} stroke={2.2} />} onClick={() => app.push({ type: 'editor' })} label="Create recipe" />;

  return (
    <Screen title="Cookbook" trailing={trailing}>
      <div style={{ padding: '16px 16px 0' }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'mine', label: `Mine` }, { value: 'saved', label: 'Saved' }, { value: 'drafts', label: 'Drafts' }]} />
      </div>

      <Pressable onClick={() => app.push({ type: 'editor' })} style={{ margin: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 'var(--radius-glass)', background: 'var(--accent-soft)', border: '1px solid var(--blush-200)' }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-card-strong)', color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconPlus size={22} stroke={2.2} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>Create a recipe</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-strong)', marginTop: 1 }}>Macros calculate as you add ingredients</div>
        </div>
        <IconChevronRight size={18} style={{ color: 'var(--accent-strong)' }} />
      </Pressable>

      <div style={{ marginTop: 20, padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-muted)' }}>{set.length} {kind === 'mine' ? 'recipes' : kind === 'saved' ? 'saved' : 'drafts'}</span>
          {kind === 'mine' && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>4 collections</span>}
        </div>
        {set.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {set.map((r) => <CookbookCard key={r.id} recipe={r} kind={kind} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 'var(--text-sm)' }}>Nothing here yet.</div>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════
//  Recipe editor
// ══════════════════════════════════════════════════════════
function EditorIngredientRow({ ing, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{ing.name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{ing.amount} · {ing.cal} cal</div>
      </div>
      <Pressable as="button" onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 9999, border: 'none', background: 'var(--surface-raised)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><IconX size={15} /></Pressable>
    </div>
  );
}

function RecipeEditor() {
  const app = useApp();
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(2);
  const [ings, setIngs] = useState([EDITOR_FOODS[0], EDITOR_FOODS[5]]);
  const [steps, setSteps] = useState(['']);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');

  const totals = ings.reduce((a, i) => ({ cal: a.cal + i.cal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { cal: 0, p: 0, c: 0, f: 0 });
  const per = { cal: Math.round(totals.cal / servings), p: Math.round(totals.p / servings), c: Math.round(totals.c / servings), f: Math.round(totals.f / servings) };
  const candidates = EDITOR_FOODS.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  const draftRecipe = { id: 'draft-new', title: title || 'Untitled recipe', grad: GRAD.tofu, cal: per.cal, p: per.p, c: per.c, f: per.f, servings, time: '20 min', creator: ME.handle, source: 'creator', tags: ['draft'], blurb: '', ingredients: ings, steps: steps.filter(Boolean), updated: 'just now', savedByFriends: 0, community: null };

  const fieldLabel = (t) => <Eyebrow style={{ marginBottom: 9 }}>{t}</Eyebrow>;
  const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '13px 15px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-strong)', background: 'var(--surface-card-strong)', outline: 'none' };

  const bottomBar = (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 22px))', background: 'var(--glass-strong)', backdropFilter: 'blur(22px) saturate(150%)', WebkitBackdropFilter: 'blur(22px) saturate(150%)', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: 10 }}>
      <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => app.saveDraft()}>Save draft</Button>
      <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={() => app.openSheet({ type: 'publish', recipe: draftRecipe })}>Save & publish</Button>
    </div>
  );

  return (
    <DetailScreen onBack={app.back} barTitle="New recipe" bottomBar={bottomBar}>
      <div style={{ paddingTop: STATUS_PAD + 50, padding: `${STATUS_PAD + 50}px 16px 130px` }}>
        <h1 style={{ margin: '0 0 18px', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)' }}>New recipe</h1>

        {/* Photo slot */}
        <div style={{ marginBottom: 20 }}>
          <image-slot id="savoro-editor-photo" shape="rounded" radius="20" placeholder="Add a photo (optional)" style={{ width: '100%', height: '170px', display: 'block', border: '1.5px dashed var(--border-strong)', background: 'var(--surface-raised)' }}></image-slot>
        </div>

        <div style={{ marginBottom: 20 }}>
          {fieldLabel('Title')}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spicy Tofu Rice Bowl" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card-strong)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>Servings (yield)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Pressable as="button" onClick={() => setServings(Math.max(1, servings - 1))} style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)', color: 'var(--text-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IconMinus size={16} stroke={2.2} /></Pressable>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center' }}>{servings}</span>
            <Pressable as="button" onClick={() => setServings(servings + 1)} style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--border)', background: 'var(--surface-card-strong)', color: 'var(--text-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IconPlus size={16} stroke={2.2} /></Pressable>
          </div>
        </div>

        {/* Live macro preview */}
        <div style={{ marginBottom: 22, padding: 16, borderRadius: 'var(--radius-glass)', background: 'var(--accent-soft)', border: '1px solid var(--blush-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-strong)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live · per serving</span>
            <IconSparkle size={15} style={{ color: 'var(--accent-strong)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{per.cal}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginLeft: -8 }}>cal</span>
            <div style={{ flex: 1 }} />
            <MacroDots p={per.p} c={per.c} f={per.f} size="md" gap={12} />
          </div>
          <div style={{ marginTop: 12 }}><MacroBar protein={per.p} carbs={per.c} fat={per.f} legend={false} height={7} /></div>
        </div>

        {/* Ingredients */}
        <div style={{ marginBottom: 22 }}>
          <SectionTitle style={{ marginBottom: 4 }}>Ingredients</SectionTitle>
          <div>{ings.map((ing, i) => <EditorIngredientRow key={i} ing={ing} onRemove={() => setIngs(ings.filter((_, j) => j !== i))} />)}</div>
          {adding ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 'var(--radius-card)', background: 'var(--surface-raised)' }}>
              <Input icon={<IconSearch size={16} />} placeholder="Search foods or type your own" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto' }}>
                {candidates.map((f) => (
                  <Pressable as="button" key={f.name} onClick={() => { setIngs([...ings, f]); setAdding(false); setQ(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{f.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{f.cal} cal</span>
                  </Pressable>
                ))}
                {q && !candidates.length && (
                  <Pressable as="button" onClick={() => { setIngs([...ings, { name: q, amount: 'custom', cal: 0, p: 0, c: 0, f: 0, source: 'creator' }]); setAdding(false); setQ(''); }} style={{ padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 'var(--text-sm)', color: 'var(--accent-strong)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Add "{q}" as free text</Pressable>
                )}
              </div>
            </div>
          ) : (
            <Pressable as="button" onClick={() => setAdding(true)} style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRadius: 'var(--radius-card)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--accent-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
              <IconSearch size={16} /> Add ingredient
            </Pressable>
          )}
        </div>

        {/* Instructions */}
        <div>
          <SectionTitle style={{ marginBottom: 12 }}>Instructions</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 9999, background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 'var(--text-sm)', flexShrink: 0, marginTop: 7 }}>{i + 1}</div>
                <textarea value={s} onChange={(e) => { const n = [...steps]; n[i] = e.target.value; setSteps(n); }} placeholder={`Step ${i + 1}…`} rows={2} style={{ flex: 1, boxSizing: 'border-box', resize: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '10px 13px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)', background: 'var(--surface-card-strong)', outline: 'none', lineHeight: 1.5 }} />
              </div>
            ))}
          </div>
          <Pressable as="button" onClick={() => setSteps([...steps, ''])} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9999, border: 'none', background: 'var(--surface-raised)', color: 'var(--text-body)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
            <IconPlus size={15} stroke={2.2} /> Add step
          </Pressable>
        </div>

        <p style={{ margin: '24px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', display: 'inline-flex', gap: 6, alignItems: 'center' }}><IconLock size={13} />Saved privately to your Cookbook until you publish.</p>
      </div>
    </DetailScreen>
  );
}

Object.assign(window, { CookbookScreen, RecipeEditor });
