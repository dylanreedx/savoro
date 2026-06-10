/* Savoro · Icon set — inline stroke SVGs, Heroicons/Lucide style.
   ~1.6 stroke, round caps/joins, currentColor, 24 viewBox.
   All attributes camelCase (React-safe). Each icon takes { size, stroke, fill }. */

function makeIcon(render) {
  return function Icon(props) {
    const size = props.size || 22;
    const sw = props.stroke || 1.7;
    const fill = props.fill || 'none';
    const style = props.style || {};
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0, ...style }}>
        {render}
      </svg>
    );
  };
}

// ── Tab bar ──────────────────────────────────────────────
const IconToday = makeIcon(<g>
  <circle cx="12" cy="13" r="5.2" />
  <path d="M12 3.4v1.6M19.5 6.2l-1.1 1.1M21 13.5h-1.5M4.5 13.5H3M5.6 6.2l1.1 1.1" />
</g>);
const IconCookbook = makeIcon(<g>
  <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" />
  <path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H18" />
  <path d="M9 8.5h5M9 11.5h5" />
</g>);
const IconDiscover = makeIcon(<g>
  <circle cx="12" cy="12" r="8.4" />
  <path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z" fill="currentColor" stroke="none" />
</g>);
const IconProfile = makeIcon(<g>
  <circle cx="12" cy="9" r="3.4" />
  <path d="M5.5 19.2a6.7 6.7 0 0 1 13 0" />
</g>);

// ── Actions ──────────────────────────────────────────────
const IconPlus = makeIcon(<g>
  <line x1="12" y1="5" x2="12" y2="19" />
  <line x1="5" y1="12" x2="19" y2="12" />
</g>);
const IconMinus = makeIcon(<line x1="5" y1="12" x2="19" y2="12" />);
const IconSearch = makeIcon(<g><circle cx="11" cy="11" r="6.6" /><line x1="16.4" y1="16.4" x2="20" y2="20" /></g>);
const IconBookmark = makeIcon(<path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.6L5.5 20V5.5a1 1 0 0 1 1-1Z" />);
const IconFork = makeIcon(<g>
  <circle cx="7" cy="6" r="2.2" /><circle cx="7" cy="18" r="2.2" /><circle cx="17" cy="8" r="2.2" />
  <path d="M7 8.2v7.6M9.2 6.5h3.4A2 2 0 0 1 14.6 8.5 2 2 0 0 1 12.6 10.5H10a3 3 0 0 0-3 3" />
</g>);
const IconCheck = makeIcon(<path d="m4.5 12.5 5 5 10-11" />);
const IconClock = makeIcon(<g><circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 1.8" /></g>);
const IconShare = makeIcon(<g>
  <path d="M12 15.5V4" /><path d="M8.5 7.2 12 3.8l3.5 3.4" />
  <path d="M6.5 12.5v6a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-6" />
</g>);
const IconUsers = makeIcon(<g>
  <circle cx="9" cy="8.5" r="3" /><path d="M3.8 18.5a5.2 5.2 0 0 1 10.4 0" />
  <path d="M15.5 6a3 3 0 0 1 0 5.4M17 18.5a5.2 5.2 0 0 0-2.2-4.2" />
</g>);
const IconChevronLeft = makeIcon(<path d="M14.5 5 8 12l6.5 7" />);
const IconChevronRight = makeIcon(<path d="M9.5 5 16 12l-6.5 7" />);
const IconChevronDown = makeIcon(<path d="m5 9 7 7 7-7" />);
const IconEllipsis = makeIcon(<g><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" /></g>);
const IconX = makeIcon(<g><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>);
const IconShield = makeIcon(<g>
  <path d="M12 3.5 5.5 6v5.2c0 4 2.7 6.8 6.5 8.3 3.8-1.5 6.5-4.3 6.5-8.3V6L12 3.5Z" />
  <path d="m9.3 11.8 1.9 1.9 3.6-3.8" />
</g>);
const IconCamera = makeIcon(<g>
  <path d="M4.5 8.5h2.7l1.4-2h6.8l1.4 2h2.7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
  <circle cx="12" cy="13.5" r="3.2" />
</g>);
const IconSliders = makeIcon(<g>
  <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
  <circle cx="15" cy="8" r="2.1" /><circle cx="9" cy="16" r="2.1" />
</g>);
const IconArrowRight = makeIcon(<g><line x1="4" y1="12" x2="19" y2="12" /><path d="M13 6l6 6-6 6" /></g>);
const IconSettings = makeIcon(<g>
  <circle cx="12" cy="12" r="3" />
  <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
</g>);
const IconBell = makeIcon(<g>
  <path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 5 2 6.5 2 6.5H4.5s2-1.5 2-6.5Z" />
  <path d="M10 20a2.2 2.2 0 0 0 4 0" />
</g>);
const IconPencil = makeIcon(<path d="M16.5 4.5 19.5 7.5 8.5 18.5l-4 1 1-4 11-11Z" />);
const IconLock = makeIcon(<g>
  <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
  <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
</g>);
const IconSparkle = makeIcon(<g>
  <path d="M12 4.5c.6 3.2 1.8 4.4 5 5-3.2.6-4.4 1.8-5 5-.6-3.2-1.8-4.4-5-5 3.2-.6 4.4-1.8 5-5Z" fill="currentColor" stroke="none" />
  <path d="M18.5 13c.3 1.4.8 1.9 2.2 2.2-1.4.3-1.9.8-2.2 2.2-.3-1.4-.8-1.9-2.2-2.2 1.4-.3 1.9-.8 2.2-2.2Z" fill="currentColor" stroke="none" />
</g>);
const IconHeart = makeIcon(<path d="M12 19.5C5.5 15 3.5 11 5 8a3.8 3.8 0 0 1 7-1 3.8 3.8 0 0 1 7 1c1.5 3-.5 7-7 11.5Z" />);
const IconCalendar = makeIcon(<g>
  <rect x="4.5" y="6" width="15" height="13.5" rx="2" />
  <path d="M4.5 10h15M8.5 4v3.5M15.5 4v3.5" />
</g>);
const IconGrid = makeIcon(<g>
  <rect x="4.5" y="4.5" width="6" height="6" rx="1.5" /><rect x="13.5" y="4.5" width="6" height="6" rx="1.5" />
  <rect x="4.5" y="13.5" width="6" height="6" rx="1.5" /><rect x="13.5" y="13.5" width="6" height="6" rx="1.5" />
</g>);
const IconList = makeIcon(<g><path d="M8.5 7h11M8.5 12h11M8.5 17h11" /><circle cx="4.8" cy="7" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.8" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.8" cy="17" r="1.1" fill="currentColor" stroke="none" /></g>);
const IconFlame = makeIcon(<path d="M12 3.5s5 3.8 5 8.8a5 5 0 0 1-10 0c0-1.8.8-3 1.6-3.8.3 1 1 1.6 1.9 1.6 0-2.6 1.5-4.6 1.5-6.6Z" />);
const IconLeaf = makeIcon(<path d="M19 5C9 5 4.5 9 4.5 16.5 4.5 18 5 19 5 19s1-6 5-9c-2.5 3-3 7-3 7s8 1 12-4c2.5-3.2 0-8 0-8Z" />);
const IconLink = makeIcon(<g>
  <path d="M10 14a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 8" />
  <path d="M14 10a3.5 3.5 0 0 0-5 0l-2.5 2.5a3.5 3.5 0 0 0 5 5L13 16" />
</g>);
const IconGlobe = makeIcon(<g><circle cx="12" cy="12" r="8.2" /><path d="M4 12h16M12 3.8c2.3 2.2 2.3 14.2 0 16.4M12 3.8c-2.3 2.2-2.3 14.2 0 16.4" /></g>);
const IconSend = makeIcon(<path d="M20 4 3.5 11l6.5 2.2L12.2 20 20 4Z" />);
const IconStar = makeIcon(<path d="m12 4 2.3 5 5.4.5-4.1 3.6 1.3 5.3L12 21l-4.8 2.4 1.3-5.3-4.1-3.6 5.4-.5L12 4Z" />);

Object.assign(window, {
  IconToday, IconCookbook, IconDiscover, IconProfile,
  IconPlus, IconMinus, IconSearch, IconBookmark, IconFork, IconCheck, IconClock, IconShare,
  IconUsers, IconChevronLeft, IconChevronRight, IconChevronDown, IconEllipsis, IconX,
  IconShield, IconCamera, IconSliders, IconArrowRight, IconSettings, IconBell,
  IconPencil, IconLock, IconSparkle, IconHeart, IconCalendar, IconGrid,
  IconList, IconFlame, IconLeaf, IconLink, IconGlobe, IconSend, IconStar,
});
