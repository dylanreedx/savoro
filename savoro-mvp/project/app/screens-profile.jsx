/* Savoro · Profile (own) + public profile. */
const { useState } = React;

function StatBlock({ value, label, onClick }) {
  return (
    <Pressable as="button" onClick={onClick} style={{ flex: 1, border: 'none', background: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </Pressable>
  );
}

function iOSSwitch({ on, onChange }) {
  return (
    <Pressable as="button" onClick={() => onChange(!on)} style={{ width: 50, height: 30, borderRadius: 9999, border: 'none', background: on ? 'var(--positive)' : 'var(--sand-300)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0, padding: 0 }} scale={1}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 9999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .2s var(--ease-out)' }} />
    </Pressable>
  );
}

function SettingsGroup({ children }) {
  return <div style={{ borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', overflow: 'hidden', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>{children}</div>;
}
function SettingsRow({ icon, label, detail, control, onClick, last }) {
  return (
    <Pressable as={onClick ? 'button' : 'div'} onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', border: 'none', borderBottom: last ? 'none' : '1px solid var(--border)', background: 'transparent', cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', textAlign: 'left' }} scale={onClick ? 0.99 : 1}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-raised)', color: 'var(--text-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{label}</span>
      {detail && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{detail}</span>}
      {control}
      {onClick && !control && <IconChevronRight size={16} style={{ color: 'var(--text-subtle)' }} />}
    </Pressable>
  );
}

function ProfileScreen() {
  const app = useApp();
  const [tab, setTab] = useState('recipes');
  const mine = ME.myRecipeIds.map(recipeById);
  const trailing = <IconBtn size={36} icon={<IconSettings size={19} />} onClick={() => {}} label="Settings" />;

  return (
    <Screen title="Profile" trailing={trailing}>
      {/* Identity */}
      <div style={{ padding: '18px 16px 0', display: 'flex', alignItems: 'center', gap: 15 }}>
        <Avatar user={ME} size={72} radius={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{ME.name}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>@{ME.handle}</div>
        </div>
      </div>
      <p style={{ margin: '14px 16px 0', fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>{ME.bio}</p>

      {/* Stats */}
      <div style={{ margin: '18px 16px 0', padding: '14px 8px', display: 'flex', borderRadius: 'var(--radius-glass)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)' }}>
        <StatBlock value={ME.recipes} label="Recipes" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <StatBlock value={ME.collections} label="Collections" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <StatBlock value={ME.followers} label="Followers" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <StatBlock value={ME.following} label="Following" />
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
        <Button variant="secondary" size="md" style={{ flex: 1 }} iconLeft={<IconPencil size={15} />} onClick={() => app.toast('Edit profile', 'check')}>Edit profile</Button>
        <Button variant="secondary" size="md" iconLeft={<IconShare size={15} />} onClick={() => app.toast('Profile link copied', 'link')}>Share</Button>
      </div>

      {/* Public recipes */}
      <div style={{ padding: '24px 16px 0' }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'recipes', label: 'Public recipes' }, { value: 'collections', label: 'Collections' }]} />
      </div>
      {tab === 'recipes' ? (
        <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {mine.map((r) => <CookbookCard key={r.id} recipe={r} kind="mine" />)}
        </div>
      ) : (
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Weeknight high-protein', 8, GRAD.shawarma], ['Cozy season', 6, GRAD.lentil], ['Sunday meal prep', 5, GRAD.turkey], ['Quick breakfasts', 5, GRAD.oats]].map(([name, n, grad]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, borderRadius: 'var(--radius-card)', background: 'var(--surface-card-strong)', border: '1px solid var(--border-glass)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: grad, flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{name}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{n} recipes</div></div>
              <IconChevronRight size={16} style={{ color: 'var(--text-subtle)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div style={{ padding: '26px 16px 0' }}>
        <Eyebrow style={{ marginBottom: 11 }}>Settings</Eyebrow>
        <SettingsGroup>
          <SettingsRow icon={<IconToday size={17} />} label="Dark appearance" control={<iOSSwitch on={app.theme === 'dark'} onChange={(v) => app.setTheme(v ? 'dark' : 'light')} />} />
          <SettingsRow icon={<IconLeaf size={16} />} label="Daily goals" detail={`${GOALS.cal} cal`} onClick={() => app.toast('Goals are private', 'lock')} />
          <SettingsRow icon={<IconLock size={15} />} label="Privacy" detail="Logs private" onClick={() => {}} last />
        </SettingsGroup>
        <p style={{ margin: '12px 4px 0', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', lineHeight: 1.5, display: 'flex', gap: 6 }}><IconLock size={13} style={{ flexShrink: 0, marginTop: 1 }} />Your daily logs and goals are never shown on your public profile.</p>
      </div>
    </Screen>
  );
}

// ── Public profile ───────────────────────────────────────
function PublicProfile({ handle }) {
  const app = useApp();
  const u = USERS[handle] || ME;
  const [following, setFollowing] = useState(false);
  const recipes = RECIPES.filter((r) => r.creator === handle);
  const fallback = recipes.length ? recipes : RECIPES.slice(0, 4);
  return (
    <DetailScreen onBack={app.back} barTitle={`@${u.handle}`} transparentBar
      trailing={<IconBtn size={36} icon={<IconShare size={18} />} onClick={() => app.toast('Profile link copied', 'link')} label="Share" />}>
      <div style={{ height: 96, background: `linear-gradient(135deg, ${u.tint}, var(--blush-100))` }} />
      <div style={{ padding: '0 16px', marginTop: -32, position: 'relative' }}>
        <div style={{ borderRadius: 24, width: 80, height: 80, border: '3px solid var(--surface-page)', overflow: 'hidden' }}><Avatar user={u} size={74} radius={21} /></div>
        <div style={{ marginTop: 12, fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{u.name}</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>@{u.handle}</div>
        <p style={{ margin: '12px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>Macro-friendly recipes, shared often. Cooking should be fun.</p>
        <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
          <div><span style={{ fontWeight: 800, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{recipes.length || 12}</span> <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>recipes</span></div>
          <div><span style={{ fontWeight: 800, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>2.4k</span> <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>followers</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant={following ? 'secondary' : 'primary'} size="md" style={{ flex: 1 }} iconLeft={following ? <IconCheck size={16} /> : <IconPlus size={16} stroke={2.2} />} onClick={() => { setFollowing(!following); app.toast(following ? 'Unfollowed' : `Following @${u.handle}`, 'check'); }}>{following ? 'Following' : 'Follow'}</Button>
          <Button variant="secondary" size="md" iconLeft={<IconSend size={15} />} onClick={() => app.toast('Message sent', 'check')}>Message</Button>
        </div>

        <div style={{ marginTop: 26 }}>
          <SectionTitle>Public recipes</SectionTitle>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fallback.map((r) => <CookbookCard key={r.id} recipe={r} kind="mine" />)}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </DetailScreen>
  );
}

Object.assign(window, { ProfileScreen, PublicProfile });
