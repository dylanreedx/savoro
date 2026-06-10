/* Savoro · Discover — social, curated recipe discovery + communities.
   3 feed layout variations + community detail. */
const { useState } = React;

const FILTERS = ['High protein', 'Meal prep', 'Quick', 'Breakfast', 'Dinner', 'Under 500', 'Vegetarian', 'Cozy'];

function FilterChips({ active, setActive }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 2px', scrollbarWidth: 'none' }}>
      <Chip active={active === 'all'} onClick={() => setActive('all')}>All</Chip>
      {FILTERS.map((f) => <Chip key={f} active={active === f} onClick={() => setActive(active === f ? 'all' : f)}>{f}</Chip>)}
    </div>
  );
}

function SearchBar() {
  const app = useApp();
  return (
    <div style={{ padding: '0 16px' }}>
      <div onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 9999, background: 'var(--surface-card-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <IconSearch size={18} style={{ color: 'var(--text-subtle)' }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-subtle)' }}>Search recipes, creators, communities</span>
      </div>
    </div>
  );
}

function Rail({ title, action, onAction, children }) {
  return (
    <div>
      <SectionTitle style={{ padding: '0 16px', marginBottom: 13 }} action={action} onAction={onAction}>{title}</SectionTitle>
      <div style={{ display: 'flex', gap: 13, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>{children}</div>
    </div>
  );
}

function FeaturedHero({ recipe, context }) {
  const app = useApp();
  const u = USERS[recipe.creator];
  return (
    <Pressable onClick={() => app.openRecipe(recipe)} style={{ margin: '0 16px', borderRadius: 'var(--radius-glass)', overflow: 'hidden', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-glass-lg), var(--shadow-inner-glass)' }}>
      <div style={{ position: 'relative', height: 230, background: recipe.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.42), transparent 56%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,24,18,0.34), transparent 52%)' }} />
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '5px 12px', fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--accent-strong)' }}><IconSparkle size={13} />{context || 'Featured for you'}</span>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}><SaveBtn recipe={recipe} floating /></div>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.08, textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>{recipe.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Avatar user={u} size={22} />
            <span style={{ fontSize: 'var(--text-xs)', color: '#fff', fontWeight: 600 }}>@{u.handle}</span>
            <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, background: 'var(--surface-card-strong)' }}>
        <ActionCluster recipe={recipe} showFork />
      </div>
    </Pressable>
  );
}

function CommunitiesRail() {
  const app = useApp();
  return (
    <Rail title="Your communities" action="See all" onAction={() => app.push({ type: 'communities' })}>
      {COMMUNITIES.map((c) => (
        <div key={c.id} style={{ width: 200, flexShrink: 0 }}><CommunityCard community={c} /></div>
      ))}
    </Rail>
  );
}

// ── Variation A — editorial rails ────────────────────────
function DiscoverRails({ active, setActive }) {
  return (
    <>
      <div style={{ marginTop: 14 }}><SearchBar /></div>
      <div style={{ marginTop: 14 }}><FilterChips active={active} setActive={setActive} /></div>
      <div style={{ marginTop: 20 }}><FeaturedHero recipe={recipeById('shawarma')} context="Featured for you" /></div>
      <div style={{ marginTop: 26 }}>
        <Rail title="Popular in your communities">
          {['turkey', 'pancakes', 'parfait', 'lentil'].map((id) => <RecipeTileMini key={id} recipe={recipeById(id)} width={156} />)}
        </Rail>
      </div>
      <div style={{ marginTop: 26 }}>
        <Rail title="High protein this week">
          {['oats', 'poke', 'tofu', 'shawarma'].map((id) => <RecipeTileMini key={id} recipe={recipeById(id)} width={156} />)}
        </Rail>
      </div>
      <div style={{ marginTop: 26 }}><CommunitiesRail /></div>
      <div style={{ marginTop: 26 }}>
        <SectionTitle style={{ padding: '0 16px', marginBottom: 13 }}>From friends</SectionTitle>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {['poke', 'turkey'].map((id) => <RecipeRow key={id} recipe={recipeById(id)} context={{ icon: <IconHeart size={13} style={{ color: 'var(--accent-strong)' }} />, label: `Saved by ${recipeById(id).savedByFriends} friends` }} />)}
        </div>
      </div>
    </>
  );
}

// ── Variation B — two-column grid ────────────────────────
function GridCard({ recipe, tall }) {
  const app = useApp();
  const u = USERS[recipe.creator];
  return (
    <Pressable onClick={() => app.openRecipe(recipe)} style={{ breakInside: 'avoid', marginBottom: 12, borderRadius: 'var(--radius-glass)', overflow: 'hidden', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
      <div style={{ position: 'relative', height: tall ? 168 : 120, background: recipe.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.42), transparent 58%)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8 }}><SaveBtn recipe={recipe} floating /></div>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)', lineHeight: 1.22 }}>{recipe.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <Avatar user={u} size={17} radius={5} />
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600 }}>@{u.handle}</span>
        </div>
        <div style={{ marginTop: 7, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{recipe.cal} cal · {recipe.p}g protein</div>
      </div>
    </Pressable>
  );
}
function DiscoverGrid({ active, setActive }) {
  const left = ['shawarma', 'oats', 'lentil', 'pancakes'];
  const right = ['poke', 'turkey', 'tofu', 'parfait'];
  return (
    <>
      <div style={{ marginTop: 14 }}><SearchBar /></div>
      <div style={{ marginTop: 14 }}><FilterChips active={active} setActive={setActive} /></div>
      <div style={{ marginTop: 22 }}><CommunitiesRail /></div>
      <div style={{ marginTop: 24, padding: '0 16px' }}>
        <SectionTitle style={{ marginBottom: 14 }}>Fresh recipes</SectionTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>{left.map((id, i) => <GridCard key={id} recipe={recipeById(id)} tall={i % 2 === 0} />)}</div>
          <div style={{ flex: 1 }}>{right.map((id, i) => <GridCard key={id} recipe={recipeById(id)} tall={i % 2 === 1} />)}</div>
        </div>
      </div>
    </>
  );
}

// ── Variation C — social feed ────────────────────────────
function DiscoverFeed({ active, setActive }) {
  const feed = [
    { user: 'maya', verb: 'published', recipe: 'poke', when: '12m' },
    { user: 'dylan', verb: 'shared', recipe: 'shawarma', when: '5h', community: 'hpmp' },
    { user: 'marco', verb: 'published', recipe: 'turkey', when: '1d', community: 'hpmp' },
    { user: 'livfit', verb: 'published', recipe: 'oats', when: '2d' },
  ];
  return (
    <>
      <div style={{ marginTop: 14 }}><SearchBar /></div>
      <div style={{ marginTop: 14 }}><FilterChips active={active} setActive={setActive} /></div>
      <div style={{ marginTop: 18, paddingLeft: 16 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingRight: 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
          {COMMUNITIES.map((c) => <CommunityChipTall key={c.id} community={c} />)}
        </div>
      </div>
      <div style={{ marginTop: 8, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {feed.map((a, i) => <FeedItem key={i} activity={a} />)}
      </div>
    </>
  );
}
function CommunityChipTall({ community }) {
  const app = useApp();
  return (
    <Pressable onClick={() => app.openCommunity(community)} style={{ width: 132, flexShrink: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-glass)', background: 'var(--surface-card-strong)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
      <div style={{ height: 52, background: community.grad }} />
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.2 }}>{community.name}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{(community.members / 1000).toFixed(1)}k members</div>
      </div>
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════
function DiscoverScreen({ layout }) {
  const app = useApp();
  const [active, setActive] = useState('all');
  const trailing = <IconBtn size={36} icon={<IconSliders size={19} />} onClick={() => {}} label="Filters" />;
  return (
    <Screen title="Discover" trailing={trailing}>
      {layout === 'grid' && <DiscoverGrid active={active} setActive={setActive} />}
      {layout === 'feed' && <DiscoverFeed active={active} setActive={setActive} />}
      {layout === 'rails' && <DiscoverRails active={active} setActive={setActive} />}
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════
//  Community detail
// ══════════════════════════════════════════════════════════
function CommunityDetail({ community }) {
  const app = useApp();
  const [joined, setJoined] = useState(false);
  const pinned = community.id === 'hpmp' ? ['turkey', 'shawarma'] : community.id === 'cozy' ? ['lentil', 'parfait'] : ['oats', 'poke'];
  const feed = [
    { user: 'dylan', verb: 'shared', recipe: pinned[0], when: '5h' },
    { user: 'marco', verb: 'shared', recipe: 'pancakes', when: '1d' },
    { user: 'maya', verb: 'shared', recipe: 'poke', when: '2d' },
  ];
  return (
    <DetailScreen onBack={app.back} barTitle={community.name} transparentBar>
      <div style={{ position: 'relative', height: 180, background: community.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 56%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, var(--surface-page))' }} />
      </div>
      <div style={{ padding: '0 16px', marginTop: -24, position: 'relative' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)' }}>{community.name}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{community.blurb}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ display: 'flex' }}>
            {['maya', 'alex', 'marco', 'jordan'].map((h, i) => <div key={h} style={{ marginLeft: i ? -9 : 0, borderRadius: 10, border: '2px solid var(--surface-page)' }}><Avatar user={h} size={30} radius={8} /></div>)}
          </div>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{community.members.toLocaleString()} members</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant={joined ? 'secondary' : 'primary'} size="md" style={{ flex: 1 }} onClick={() => { setJoined(!joined); app.toast(joined ? 'Left community' : 'Joined community', 'check'); }}>{joined ? 'Joined' : 'Join'}</Button>
          <Button variant="secondary" size="md" iconLeft={<IconShare size={16} />} onClick={() => app.toast('Invite link copied', 'link')}>Invite</Button>
        </div>

        <div style={{ marginTop: 26 }}>
          <SectionTitle>Pinned recipes</SectionTitle>
          <div style={{ display: 'flex', gap: 13, overflowX: 'auto', margin: '13px -16px 0', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
            {pinned.map((id) => <RecipeTileMini key={id} recipe={recipeById(id)} width={160} />)}
          </div>
        </div>

        <div style={{ marginTop: 26 }}>
          <SectionTitle>Recipe feed</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 13 }}>
            {feed.map((a, i) => <FeedItem key={i} activity={a} />)}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </DetailScreen>
  );
}

function CommunitiesAll() {
  const app = useApp();
  return (
    <DetailScreen onBack={app.back} barTitle="Communities">
      <div style={{ paddingTop: STATUS_PAD + 50, padding: `${STATUS_PAD + 50}px 16px 40px` }}>
        <h1 style={{ margin: '0 0 18px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-strong)' }}>Communities</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {COMMUNITIES.map((c) => <CommunityCard key={c.id} community={c} />)}
        </div>
      </div>
    </DetailScreen>
  );
}

Object.assign(window, { DiscoverScreen, CommunityDetail, CommunitiesAll });
