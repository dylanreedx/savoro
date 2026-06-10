/* Savoro · App root — routing, state, transitions, tweaks, mount. */
const { useState, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "todayLayout": "rings",
  "discoverLayout": "rails"
}/*EDITMODE-END*/;

// Scaling stage — fits the 402×874 device into any viewport, centered.
function Stage({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const padW = window.innerWidth < 520 ? 0 : 40;
      const padH = window.innerWidth < 520 ? 0 : 40;
      setScale(Math.min((window.innerWidth - padW) / 402, (window.innerHeight - padH) / 874, 1.05));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: 402, height: 874, transform: `scale(${scale})`, transformOrigin: 'center', flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// Slide layer for pushed screens
function SlideLayer({ children, leaving, onExited }) {
  const [p, setP] = useState(leaving ? 0 : 100);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setP(leaving ? 100 : 0)));
    return () => cancelAnimationFrame(r);
  }, [leaving]);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 15, transform: `translateX(${p}%)`,
      transition: 'transform .34s var(--ease-out)', boxShadow: '-12px 0 30px rgba(0,0,0,0.08)',
    }}>{children}</div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = t.dark ? 'dark' : 'light';

  const [tab, setTabState] = useState('today');
  const [nav, setNav] = useState([]);
  const [leaving, setLeaving] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toastState, setToastState] = useState(null);
  const [log, setLog] = useState(() => JSON.parse(JSON.stringify(TODAY_LOG)));
  const [saved, setSaved] = useState(() => new Set(ME.savedRecipeIds));
  const toastTimer = useRef(null);
  const keySeq = useRef(1);

  const toast = useCallback((msg, icon) => {
    setToastState({ msg, icon });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), 2300);
  }, []);

  const push = useCallback((entry) => setNav((n) => [...n, { ...entry, key: keySeq.current++ }]), []);
  const back = useCallback(() => {
    setNav((n) => {
      if (!n.length) return n;
      const top = n[n.length - 1];
      setLeaving(top);
      setTimeout(() => setLeaving(null), 360);
      return n.slice(0, -1);
    });
  }, []);
  const setTab = useCallback((id) => { setNav([]); setLeaving(null); setTabState(id); }, []);

  const openRecipe = useCallback((r) => push({ type: 'recipe', recipe: r }), [push]);
  const openCommunity = useCallback((c) => push({ type: 'community', community: c }), [push]);
  const openProfile = useCallback((h) => { if (h === ME.handle) setTab('profile'); else push({ type: 'publicProfile', handle: h }); }, [push, setTab]);
  const openSheet = useCallback((s) => setSheet(s), []);

  const isSaved = useCallback((id) => saved.has(id), [saved]);
  const savedList = useCallback(() => [...saved], [saved]);
  const toggleSave = useCallback((recipe) => {
    setSaved((prev) => {
      const n = new Set(prev);
      if (n.has(recipe.id)) { n.delete(recipe.id); toast('Removed from Cookbook', 'bookmark'); }
      else { n.add(recipe.id); toast('Saved to Cookbook', 'bookmark'); }
      return n;
    });
  }, [toast]);

  const logRecipe = useCallback((recipe, servings, meal) => {
    setLog((prev) => ({ ...prev, [meal]: [...(prev[meal] || []), { recipe: recipe.id.replace('-fork', ''), servings }] }));
    setSheet(null);
    setNav([]); setLeaving(null);
    setTabState('today');
    const label = meal.charAt(0).toUpperCase() + meal.slice(1);
    setTimeout(() => toast(`Logged to ${label}`, 'check'), 120);
  }, [toast]);

  const forkRecipe = useCallback((recipe) => {
    setSheet(null);
    push({ type: 'recipe', recipe: { ...recipe, id: recipe.id + '-fork', creator: ME.handle, updated: 'just now', community: null }, forkedFrom: recipe.creator });
    setSaved((prev) => new Set(prev).add(recipe.id + '-fork'));
    setTimeout(() => toast('Saved as a private remix', 'fork'), 120);
  }, [push, toast]);

  const shareToCommunity = useCallback((recipe, community) => { setSheet(null); setTimeout(() => toast(`Shared to ${community.name}`, 'check'), 100); }, [toast]);
  const confirmShare = useCallback((msg) => { setSheet(null); setTimeout(() => toast(msg, msg.includes('link') ? 'link' : 'check'), 100); }, [toast]);
  const finishPublish = useCallback((choice) => {
    if (choice === 'community') { setSheet(null); return; }
    setSheet(null); setNav([]); setLeaving(null); setTabState('cookbook');
    const msg = choice === 'private' ? 'Saved privately to your Cookbook' : choice === 'unlisted' ? 'Unlisted link created' : 'Published to your profile';
    setTimeout(() => toast(msg, choice === 'private' ? 'lock' : 'check'), 150);
  }, [toast]);
  const saveDraft = useCallback(() => { setNav([]); setLeaving(null); setTabState('cookbook'); setTimeout(() => toast('Saved to Drafts', 'lock'), 150); }, [toast]);

  const ctx = {
    tab, setTab, push, back, openRecipe, openCommunity, openProfile, openSheet,
    isSaved, savedList, toggleSave, log, logRecipe, forkRecipe, shareToCommunity,
    confirmShare, finishPublish, saveDraft, toast, theme, setTheme: (v) => setTweak('dark', v === 'dark'),
  };

  const renderTab = () => {
    switch (tab) {
      case 'today': return <TodayScreen layout={t.todayLayout} />;
      case 'cookbook': return <CookbookScreen />;
      case 'discover': return <DiscoverScreen layout={t.discoverLayout} />;
      case 'profile': return <ProfileScreen />;
      default: return null;
    }
  };
  const renderPushed = (e) => {
    switch (e.type) {
      case 'recipe': return <RecipeDetail recipe={e.recipe} forkedFrom={e.forkedFrom} />;
      case 'community': return <CommunityDetail community={e.community} />;
      case 'communities': return <CommunitiesAll />;
      case 'publicProfile': return <PublicProfile handle={e.handle} />;
      case 'editor': return <RecipeEditor />;
      default: return null;
    }
  };

  const todayLabels = { rings: 'Rings + bars', tiles: 'Stat tiles', minimal: 'Minimal' };
  const discoverLabels = { rails: 'Editorial', grid: 'Grid', feed: 'Social' };

  return (
    <div data-theme={theme} style={{
      position: 'fixed', inset: 0,
      background: theme === 'dark'
        ? 'radial-gradient(circle at 50% 0%, oklch(0.24 0.02 60), oklch(0.15 0.01 50))'
        : 'radial-gradient(circle at 50% 0%, oklch(0.95 0.012 75), oklch(0.9 0.014 70))',
      fontFamily: 'var(--font-sans)',
    }}>
      <Stage>
        <IOSDevice dark={theme === 'dark'}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--surface-page)', color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}>
            <AppCtx.Provider value={ctx}>
              {renderTab()}
              {nav.map((e) => <SlideLayer key={e.key}>{renderPushed(e)}</SlideLayer>)}
              {leaving && <SlideLayer leaving>{renderPushed(leaving)}</SlideLayer>}
              {nav.length === 0 && <TabBar tab={tab} setTab={setTab} />}
              <SheetHost sheet={sheet} onClose={() => setSheet(null)} render={renderSheet} />
              <Toast toast={toastState} />
            </AppCtx.Provider>
          </div>
        </IOSDevice>
      </Stage>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Today dashboard" />
        <TweakRadio label="Layout" value={t.todayLayout}
          options={[{ value: 'rings', label: 'Rings' }, { value: 'tiles', label: 'Tiles' }, { value: 'minimal', label: 'Minimal' }]}
          onChange={(v) => { setTweak('todayLayout', v); setTabState('today'); setNav([]); }} />
        <TweakSection label="Discover feed" />
        <TweakRadio label="Layout" value={t.discoverLayout}
          options={[{ value: 'rails', label: 'Rails' }, { value: 'grid', label: 'Grid' }, { value: 'feed', label: 'Feed' }]}
          onChange={(v) => { setTweak('discoverLayout', v); setTabState('discover'); setNav([]); }} />
      </TweaksPanel>
    </div>
  );
}

// Mount onto a pristine node so a (harness/double-eval) re-run never calls
// createRoot() on an already-rooted container.
const oldRoot = document.getElementById('root');
const rootEl = oldRoot.cloneNode(false);
oldRoot.replaceWith(rootEl);
ReactDOM.createRoot(rootEl).render(<App />);
