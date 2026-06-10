/* @ds-bundle: {"format":3,"namespace":"SavoroDesignSystem_198dc0","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"GlassCard","sourcePath":"components/core/GlassCard.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"SectionLabel","sourcePath":"components/core/SectionLabel.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"CalorieRing","sourcePath":"components/nutrition/CalorieRing.jsx"},{"name":"FoodCard","sourcePath":"components/nutrition/FoodCard.jsx"},{"name":"MacroBar","sourcePath":"components/nutrition/MacroBar.jsx"},{"name":"QuickLogChip","sourcePath":"components/nutrition/QuickLogChip.jsx"},{"name":"RecipeCard","sourcePath":"components/nutrition/RecipeCard.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"914ad296d7cd","components/core/Button.jsx":"beda4551bb84","components/core/GlassCard.jsx":"24c23e05be0b","components/core/Logo.jsx":"90e635f20112","components/core/SectionLabel.jsx":"037b3b31626d","components/forms/Input.jsx":"daa62feb0884","components/nutrition/CalorieRing.jsx":"8d5f5ea2c961","components/nutrition/FoodCard.jsx":"f03537248ca9","components/nutrition/MacroBar.jsx":"00da02100662","components/nutrition/QuickLogChip.jsx":"153aff37c8e3","components/nutrition/RecipeCard.jsx":"2765001f3a92","ui_kits/savoro/parts.jsx":"a3b49c132afc","ui_kits/savoro/screens.jsx":"230977fd484c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SavoroDesignSystem_198dc0 = window.SavoroDesignSystem_198dc0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro Badge — small pill label with a soft tinted background.
 * Four tones drawn from the brand accents.
 */
function Badge({
  children,
  variant = 'default',
  style = {},
  ...rest
}) {
  const variants = {
    default: {
      background: 'var(--sand-100)',
      color: 'var(--sand-600)'
    },
    blush: {
      background: 'var(--blush-100)',
      color: 'var(--blush-500)'
    },
    sage: {
      background: 'var(--sage-100)',
      color: 'var(--sage-400)'
    },
    lavender: {
      background: 'var(--lavender-100)',
      color: 'var(--lavender-300)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'var(--radius-pill)',
      padding: '0.25rem 0.75rem',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-medium)',
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro Button — pill-shaped, three variants, three sizes.
 * Primary is solid sand-900; secondary is glass; ghost is text-only.
 * Presses gently shrink to 0.97. Renders an <a> when `href` is set.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  disabled = false,
  iconRight,
  iconLeft,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sizes = {
    sm: {
      padding: '0.5rem 1rem',
      fontSize: 'var(--text-sm)'
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: 'var(--text-sm)'
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: 'var(--text-base)'
    }
  };
  const variants = {
    primary: {
      background: hover ? 'var(--sand-800)' : 'var(--sand-900)',
      color: 'var(--text-inverse)',
      border: '1px solid transparent',
      boxShadow: hover ? 'var(--shadow-glass)' : 'var(--shadow-sm)'
    },
    secondary: {
      background: hover ? 'var(--glass-hover)' : 'var(--glass)',
      color: 'var(--text-strong)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(var(--blur-glass))',
      WebkitBackdropFilter: 'blur(var(--blur-glass))',
      boxShadow: 'var(--shadow-glass)'
    },
    ghost: {
      background: hover ? 'var(--sand-100)' : 'transparent',
      color: hover ? 'var(--text-strong)' : 'var(--text-muted)',
      border: '1px solid transparent',
      boxShadow: 'none'
    }
  };
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-tight)',
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
    transform: active && !disabled ? 'scale(0.97)' : 'scale(1)',
    ...sizes[size],
    ...variants[variant],
    ...style
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false)
  };
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, iconLeft, children, iconRight);
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: baseStyle
    }, handlers, rest), content);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    style: baseStyle,
    disabled: disabled
  }, handlers, rest), content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/GlassCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro GlassCard — the signature translucent, blurred surface.
 * Set `strong` for the higher-opacity variant, `hover` to lift on
 * pointer-over. Pass any content as children.
 */
function GlassCard({
  children,
  strong = false,
  hover = false,
  padding = '1.5rem',
  style = {},
  ...rest
}) {
  const [isHover, setIsHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setIsHover(true),
    onMouseLeave: () => setIsHover(false),
    style: {
      background: hover && isHover ? 'var(--glass-hover)' : strong ? 'var(--glass-strong)' : 'var(--glass)',
      backdropFilter: `blur(${strong ? 'var(--blur-glass-strong)' : 'var(--blur-glass)'})`,
      WebkitBackdropFilter: `blur(${strong ? 'var(--blur-glass-strong)' : 'var(--blur-glass)'})`,
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-glass)',
      boxShadow: hover && isHover ? 'var(--shadow-glass-lg), var(--shadow-inner-glass)' : 'var(--shadow-glass), var(--shadow-inner-glass)',
      padding,
      transition: 'transform var(--dur-slow) var(--ease-out), box-shadow var(--dur-slow) var(--ease-out), background var(--dur-slow) var(--ease-out)',
      transform: hover && isHover ? 'translateY(-4px)' : 'translateY(0)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { GlassCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/GlassCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro Logo — the lowercase "savoro" wordmark with the blush dot.
 * The dot is the brand signature; keep it blush. Use `mark` for the
 * nav lockup (dot sits as a small circle after the word) or default
 * for the period-dot wordmark.
 */
function Logo({
  size = 'md',
  inverse = false,
  mark = false,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: 'var(--text-lg)',
    md: 'var(--text-xl)',
    lg: 'var(--text-2xl)'
  };
  const wordColor = inverse ? 'var(--text-inverse)' : 'var(--text-strong)';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: mark ? '0.2rem' : 0,
      fontFamily: 'var(--font-sans)',
      fontSize: sizes[size],
      fontWeight: 'var(--weight-extrabold)',
      letterSpacing: 'var(--tracking-tight)',
      color: wordColor,
      ...style
    }
  }, rest), "savoro", mark ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: '0.4em',
      height: '0.4em',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--blush-300)',
      alignSelf: 'center'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "."));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro SectionLabel — the small uppercase, wide-tracked eyebrow
 * that sits above section headings.
 */
function SectionLabel({
  children,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("p", _extends({
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--text-subtle)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Savoro Input — pill text field. Default sits on white with a sand
 * ring; `dark` inverts for use on sand-900 surfaces. Pass `icon` to
 * render a leading glyph (e.g. a search icon).
 */
function Input({
  dark = false,
  icon,
  style = {},
  wrapperStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const ring = focused ? '0 0 0 2px var(--ring)' : `inset 0 0 0 1px ${dark ? 'var(--sand-700)' : 'var(--sand-200)'}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      ...wrapperStyle
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '1rem',
      display: 'inline-flex',
      color: 'var(--text-subtle)',
      pointerEvents: 'none'
    }
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocused(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur?.(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      border: 'none',
      outline: 'none',
      borderRadius: 'var(--radius-pill)',
      padding: icon ? '0.875rem 1.25rem 0.875rem 2.5rem' : '0.875rem 1.25rem',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      background: dark ? 'var(--sand-800)' : 'var(--glass-strong)',
      color: dark ? 'var(--sand-100)' : 'var(--text-strong)',
      boxShadow: ring,
      transition: 'box-shadow var(--dur-base) var(--ease-out)',
      ...style
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/nutrition/CalorieRing.jsx
try { (() => {
/**
 * Savoro CalorieRing — the circular progress ring showing calories
 * consumed against a goal, with the count stacked in the center.
 * Animates from empty to its value on mount.
 */
function CalorieRing({
  current = 0,
  goal = 2000,
  size = 96,
  stroke = 6,
  style = {}
}) {
  const radius = (50 - stroke / 2) * 0.84; // matches source proportions (~42 on 100 viewBox)
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(current / goal, 1);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const offset = mounted ? circumference * (1 - pct) : circumference;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    style: {
      width: '100%',
      height: '100%',
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    strokeWidth: stroke,
    stroke: "var(--sand-200)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    strokeWidth: stroke,
    stroke: "var(--macro-calories)",
    strokeDasharray: circumference,
    strokeDashoffset: offset,
    strokeLinecap: "round",
    style: {
      transition: 'stroke-dashoffset 1s var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size > 80 ? 'var(--text-lg)' : 'var(--text-base)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1
    }
  }, current.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-subtle)',
      marginTop: 2
    }
  }, "/ ", goal.toLocaleString())));
}
Object.assign(__ds_scope, { CalorieRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutrition/CalorieRing.jsx", error: String((e && e.message) || e) }); }

// components/nutrition/MacroBar.jsx
try { (() => {
/**
 * Savoro MacroBar — the segmented protein / carbs / fat ratio bar
 * with an optional legend. Widths are computed from the gram values
 * (proportional, not goal-relative). The brand macro colors are fixed:
 * protein = sage, carbs = blush, fat = sand.
 */
function MacroBar({
  protein = 0,
  carbs = 0,
  fat = 0,
  legend = true,
  height = 6,
  style = {}
}) {
  const total = protein + carbs + fat || 1;
  const segs = [{
    key: 'P',
    label: 'Protein',
    val: protein,
    color: 'var(--macro-protein)'
  }, {
    key: 'C',
    label: 'Carbs',
    val: carbs,
    color: 'var(--macro-carbs)'
  }, {
    key: 'F',
    label: 'Fat',
    val: fat,
    color: 'var(--macro-fat)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height,
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden',
      background: 'var(--sand-200)'
    }
  }, segs.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    style: {
      width: `${s.val / total * 100}%`,
      background: s.color,
      transition: 'width var(--dur-slower) var(--ease-out)'
    }
  }))), legend && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '0.4rem'
    }
  }, segs.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.key,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: s.color
    }
  }), s.key, " ", s.val, "g"))));
}
Object.assign(__ds_scope, { MacroBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutrition/MacroBar.jsx", error: String((e && e.message) || e) }); }

// components/nutrition/FoodCard.jsx
try { (() => {
/**
 * Savoro FoodCard — a single logged food / ingredient row on glass:
 * name, serving amount, calories, and a proportional macro bar.
 */
function FoodCard({
  name,
  amount,
  calories,
  protein = 0,
  carbs = 0,
  fat = 0,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      background: 'var(--glass-strong)',
      backdropFilter: 'blur(var(--blur-glass-strong))',
      WebkitBackdropFilter: 'blur(var(--blur-glass-strong))',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-glass)',
      boxShadow: 'var(--shadow-glass), var(--shadow-inner-glass)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, calories, " cal")), amount && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0.15rem 0 0',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-subtle)'
    }
  }, amount), /*#__PURE__*/React.createElement(__ds_scope.MacroBar, {
    protein: protein,
    carbs: carbs,
    fat: fat,
    height: 6,
    style: {
      marginTop: '0.6rem'
    }
  })));
}
Object.assign(__ds_scope, { FoodCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutrition/FoodCard.jsx", error: String((e && e.message) || e) }); }

// components/nutrition/QuickLogChip.jsx
try { (() => {
/**
 * Savoro QuickLogChip — a toggleable pill for one-tap food logging.
 * Unselected: white/glass with sand border. Selected: sage tint with
 * a check and a slight press-in. Controlled via `selected`/`onToggle`,
 * or uncontrolled by default.
 */
function QuickLogChip({
  name,
  emoji,
  calories,
  selected,
  onToggle,
  style = {}
}) {
  const [internal, setInternal] = React.useState(false);
  const isControlled = selected !== undefined;
  const on = isControlled ? selected : internal;
  const toggle = () => {
    if (!isControlled) setInternal(v => !v);
    onToggle?.(!on);
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      borderRadius: 'var(--radius-pill)',
      padding: '0.5rem 1rem',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      transition: 'all var(--dur-base) var(--ease-out)',
      transform: on ? 'scale(0.97)' : 'scale(1)',
      border: `1px solid ${on ? 'var(--sage-300)' : 'var(--sand-200)'}`,
      background: on ? 'var(--sage-100)' : 'var(--glass-strong)',
      color: on ? 'var(--sage-400)' : 'var(--text-body)',
      boxShadow: on ? 'var(--shadow-sm)' : 'none'
    }
  }, emoji && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)'
    }
  }, emoji), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-medium)'
    }
  }, name), calories != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: on ? 'var(--sage-400)' : 'var(--text-subtle)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, calories), on && /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3.5 8.5 6.5 11.5 12.5 5.5"
  })));
}
Object.assign(__ds_scope, { QuickLogChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutrition/QuickLogChip.jsx", error: String((e && e.message) || e) }); }

// components/nutrition/RecipeCard.jsx
try { (() => {
/**
 * Savoro RecipeCard — the shareable log-native recipe tile: a soft
 * gradient header with tag chips, then title, macro summary, and meta.
 * Lifts on hover. `gradient` is any CSS gradient string for the header.
 */
function RecipeCard({
  title,
  calories,
  protein = 0,
  carbs = 0,
  fat = 0,
  servings = 1,
  prepTime,
  tags = [],
  gradient = 'linear-gradient(135deg, var(--blush-200), var(--blush-100) 50%, var(--sage-100))',
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      overflow: 'hidden',
      background: 'var(--glass)',
      backdropFilter: 'blur(var(--blur-glass))',
      WebkitBackdropFilter: 'blur(var(--blur-glass))',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-glass)',
      boxShadow: hover ? 'var(--shadow-glass-lg), var(--shadow-inner-glass)' : 'var(--shadow-glass), var(--shadow-inner-glass)',
      transform: hover ? 'translateY(-4px)' : 'translateY(0)',
      transition: 'transform var(--dur-slow) var(--ease-out), box-shadow var(--dur-slow) var(--ease-out)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 160,
      background: gradient
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.3) 0%, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      display: 'flex',
      gap: '0.4rem'
    }
  }, tags.slice(0, 2).map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '0.25rem 0.625rem',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--sand-700)'
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '1.25rem'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginTop: '1rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, calories, " cal"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.5rem',
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-protein)'
    }
  }), "P ", protein, "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-carbs)'
    }
  }), "C ", carbs, "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-fat)'
    }
  }), "F ", fat, "g"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginTop: '0.75rem',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", null, servings, " serving", servings > 1 ? 's' : ''), prepTime && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 12,
      background: 'var(--sand-200)'
    }
  }), /*#__PURE__*/React.createElement("span", null, prepTime)))));
}
Object.assign(__ds_scope, { RecipeCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutrition/RecipeCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/savoro/parts.jsx
try { (() => {
/* Savoro UI-kit primitives + sample data.
   Cosmetic recreations styled from the design-system tokens (styles.css).
   Exported to window so screen files can use them. */

const {
  useState,
  useEffect
} = React;
function Logo({
  inverse,
  size = 22
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      fontFamily: 'var(--font-sans)',
      fontSize: size,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: inverse ? 'var(--sand-50)' : 'var(--sand-900)'
    }
  }, "savoro", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--blush-400)'
    }
  }, "."));
}
function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  iconRight
}) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);
  const sizes = {
    sm: '8px 16px',
    md: '12px 24px',
    lg: '16px 32px'
  };
  const fs = {
    sm: 14,
    md: 14,
    lg: 16
  };
  const variants = {
    primary: {
      background: h ? 'var(--sand-800)' : 'var(--sand-900)',
      color: 'var(--sand-50)',
      border: '1px solid transparent',
      boxShadow: h ? 'var(--shadow-glass)' : 'var(--shadow-sm)'
    },
    secondary: {
      background: h ? 'var(--glass-hover)' : 'var(--glass)',
      color: 'var(--sand-900)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-glass)'
    },
    ghost: {
      background: h ? 'var(--sand-100)' : 'transparent',
      color: h ? 'var(--sand-900)' : 'var(--sand-600)',
      border: '1px solid transparent'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => {
      setH(false);
      setA(false);
    },
    onMouseDown: () => setA(true),
    onMouseUp: () => setA(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      borderRadius: 9999,
      cursor: 'pointer',
      padding: sizes[size],
      fontSize: fs[size],
      transition: 'all .2s var(--ease-out)',
      transform: a ? 'scale(0.97)' : 'scale(1)',
      ...variants[variant]
    }
  }, children, iconRight);
}
function Glass({
  children,
  strong,
  hover,
  style = {}
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      background: hover && h ? 'var(--glass-hover)' : strong ? 'var(--glass-strong)' : 'var(--glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-glass)',
      boxShadow: hover && h ? 'var(--shadow-glass-lg), var(--shadow-inner-glass)' : 'var(--shadow-glass), var(--shadow-inner-glass)',
      transition: 'all .3s var(--ease-out)',
      transform: hover && h ? 'translateY(-4px)' : 'none',
      ...style
    }
  }, children);
}
function Label({
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.2em',
      color: 'var(--sand-400)',
      ...style
    }
  }, children);
}
function Badge({
  children,
  variant = 'default'
}) {
  const v = {
    default: {
      background: 'var(--sand-100)',
      color: 'var(--sand-600)'
    },
    blush: {
      background: 'var(--blush-100)',
      color: 'var(--blush-500)'
    },
    sage: {
      background: 'var(--sage-100)',
      color: 'var(--sage-400)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 9999,
      padding: '4px 12px',
      fontSize: 12,
      fontWeight: 500,
      ...v[variant]
    }
  }, children);
}
const RECIPES = [{
  id: 1,
  title: 'High-Protein Overnight Oats',
  cal: 420,
  p: 34,
  c: 45,
  f: 12,
  servings: 1,
  time: '5 min prep',
  tags: ['breakfast', 'high-protein'],
  grad: 'linear-gradient(135deg, var(--blush-200), var(--blush-100) 50%, var(--sage-100))'
}, {
  id: 2,
  title: 'Chicken Shawarma Bowl',
  cal: 520,
  p: 42,
  c: 48,
  f: 18,
  servings: 2,
  time: '25 min',
  tags: ['lunch', 'high-protein'],
  grad: 'linear-gradient(135deg, var(--sand-200), var(--blush-100) 50%, var(--lavender-100))'
}, {
  id: 3,
  title: 'Salmon Poke Bowl',
  cal: 480,
  p: 38,
  c: 42,
  f: 22,
  servings: 1,
  time: '15 min',
  tags: ['dinner', 'omega-3'],
  grad: 'linear-gradient(135deg, var(--sage-200), var(--sage-100) 50%, var(--blush-50))'
}, {
  id: 4,
  title: 'Greek Yogurt Parfait',
  cal: 310,
  p: 28,
  c: 32,
  f: 8,
  servings: 1,
  time: '3 min',
  tags: ['snack', 'quick'],
  grad: 'linear-gradient(135deg, var(--lavender-100), var(--blush-100) 50%, var(--sand-100))'
}, {
  id: 5,
  title: 'Turkey Meatball Meal Prep',
  cal: 440,
  p: 45,
  c: 30,
  f: 14,
  servings: 4,
  time: '35 min',
  tags: ['meal-prep', 'batch-cook'],
  grad: 'linear-gradient(135deg, var(--sand-300), var(--sand-200) 50%, var(--blush-100))'
}, {
  id: 6,
  title: 'Avocado Egg Toast',
  cal: 380,
  p: 22,
  c: 28,
  f: 20,
  servings: 1,
  time: '8 min',
  tags: ['breakfast', 'vegetarian'],
  grad: 'linear-gradient(135deg, var(--sage-200), var(--sage-100) 50%, var(--sand-100))'
}];
const QUICKLOG = [{
  id: 'coffee',
  name: 'Black Coffee',
  emoji: '☕',
  cal: 5
}, {
  id: 'eggs',
  name: '2 Eggs',
  emoji: '🥚',
  cal: 140
}, {
  id: 'banana',
  name: 'Banana',
  emoji: '🍌',
  cal: 105
}, {
  id: 'chicken',
  name: 'Chicken Breast',
  emoji: '🍗',
  cal: 165
}, {
  id: 'rice',
  name: 'Brown Rice',
  emoji: '🍚',
  cal: 215
}, {
  id: 'yogurt',
  name: 'Greek Yogurt',
  emoji: '🥛',
  cal: 130
}];
function MacroBar({
  p,
  c,
  f,
  height = 6,
  legend
}) {
  const total = p + c + f || 1;
  const segs = [['P', p, 'var(--macro-protein)'], ['C', c, 'var(--macro-carbs)'], ['F', f, 'var(--macro-fat)']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height,
      borderRadius: 9999,
      overflow: 'hidden',
      background: 'var(--sand-200)'
    }
  }, segs.map(([k, v, col]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      width: `${v / total * 100}%`,
      background: col,
      transition: 'width .7s var(--ease-out)'
    }
  }))), legend && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 6
    }
  }, segs.map(([k, v, col]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      color: 'var(--sand-400)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: col
    }
  }), k, " ", v, "g"))));
}
function CalorieRing({
  current,
  goal,
  size = 96
}) {
  const r = 42,
    circ = 2 * Math.PI * r,
    pct = Math.min(current / goal, 1);
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    style: {
      width: '100%',
      height: '100%',
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    strokeWidth: "6",
    stroke: "var(--sand-200)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    strokeWidth: "6",
    stroke: "var(--macro-calories)",
    strokeDasharray: circ,
    strokeDashoffset: m ? circ * (1 - pct) : circ,
    strokeLinecap: "round",
    style: {
      transition: 'stroke-dashoffset 1s var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--sand-900)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1
    }
  }, current.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--sand-400)',
      marginTop: 2
    }
  }, "/ ", goal.toLocaleString())));
}
Object.assign(window, {
  Logo,
  Button,
  Glass,
  Label,
  Badge,
  MacroBar,
  CalorieRing,
  RECIPES,
  QUICKLOG
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/savoro/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/savoro/screens.jsx
try { (() => {
/* Savoro UI-kit screens: Nav, Home, Recipes, Dashboard, Footer + App shell. */
const {
  useState
} = React;
const ArrowR = () => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("line", {
  x1: "3",
  y1: "8",
  x2: "12",
  y2: "8"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "8.5 4.5 12 8 8.5 11.5"
}));
function Blobs() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none'
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -96,
      right: '25%',
      width: 384,
      height: 384,
      borderRadius: 9999,
      background: 'var(--blush-100)',
      opacity: 0.4,
      filter: 'blur(80px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 192,
      left: -96,
      width: 288,
      height: 288,
      borderRadius: 9999,
      background: 'var(--sage-100)',
      opacity: 0.3,
      filter: 'blur(80px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 256,
      height: 256,
      borderRadius: 9999,
      background: 'var(--lavender-100)',
      opacity: 0.25,
      filter: 'blur(80px)'
    }
  }));
}
function Nav({
  route,
  go
}) {
  const links = [['home', 'Home'], ['recipes', 'Recipes'], ['app', 'Dashboard']];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--glass-strong)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1152,
      margin: '0 auto',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => go('home'),
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Logo, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, links.map(([id, label]) => /*#__PURE__*/React.createElement("a", {
    key: id,
    onClick: () => go(id),
    style: {
      cursor: 'pointer',
      borderRadius: 9999,
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 500,
      color: route === id ? 'var(--sand-900)' : 'var(--sand-500)',
      transition: 'color .2s'
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => go('app')
  }, "Join Waitlist")))));
}
function RecipeTile({
  r
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      overflow: 'hidden',
      background: 'var(--glass)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-glass)',
      boxShadow: h ? 'var(--shadow-glass-lg), var(--shadow-inner-glass)' : 'var(--shadow-glass), var(--shadow-inner-glass)',
      transform: h ? 'translateY(-4px)' : 'none',
      transition: 'all .3s var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 160,
      background: r.grad
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.3) 0%, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      display: 'flex',
      gap: 6
    }
  }, r.tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      borderRadius: 9999,
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(8px)',
      padding: '4px 10px',
      fontSize: 10,
      fontWeight: 500,
      color: 'var(--sand-700)'
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--sand-900)'
    }
  }, r.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--sand-900)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.cal, " cal"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      fontSize: 10,
      color: 'var(--sand-400)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-protein)'
    }
  }), "P ", r.p, "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-carbs)'
    }
  }), "C ", r.c, "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--macro-fat)'
    }
  }), "F ", r.f, "g"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      fontSize: 12,
      color: 'var(--sand-400)'
    }
  }, /*#__PURE__*/React.createElement("span", null, r.servings, " serving", r.servings > 1 ? 's' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 12,
      background: 'var(--sand-200)'
    }
  }), /*#__PURE__*/React.createElement("span", null, r.time))));
}
function Home({
  go
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Blobs, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1152,
      margin: '0 auto',
      padding: '80px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      borderRadius: 9999,
      border: '1px solid var(--sand-200)',
      background: 'rgba(255,255,255,0.7)',
      padding: '6px 16px',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--sand-500)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--sage-300)'
    }
  }), "Coming soon"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '24px 0 0',
      fontSize: 60,
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
      color: 'var(--sand-900)'
    }
  }, "Your recipes are", /*#__PURE__*/React.createElement("br", null), "your food log."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '24px 0 0',
      maxWidth: 460,
      fontSize: 18,
      lineHeight: 1.65,
      color: 'var(--sand-500)'
    }
  }, "Savoro unifies meal logging and recipe management into one fluid experience \u2014 built for lifters, meal preppers, and anyone who wants to actually enjoy tracking."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: () => go('app')
  }, "Join the Waitlist"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    iconRight: /*#__PURE__*/React.createElement(ArrowR, null),
    onClick: () => go('recipes')
  }, "Explore Recipes"))), /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'rotate(1deg)'
    }
  }, /*#__PURE__*/React.createElement(DailySnapshot, null)))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--sand-100)',
      padding: '96px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1152,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement(Label, {
    style: {
      marginBottom: 16
    }
  }, "Why Savoro"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 36,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: 'var(--sand-900)'
    }
  }, "Trust. Speed. Shareability."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '16px auto 0',
      maxWidth: 520,
      fontSize: 16,
      color: 'var(--sand-500)'
    }
  }, "Three things every nutrition app should get right \u2014 and almost none do.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 24
    }
  }, [['Trusted data', 'Every nutrition value traces to a source — USDA, verified labels, or curated submissions. No mystery entries.'], ['Respect your time', 'Quick-log chips, smart search, barcode scanning. Log a meal in seconds, not minutes.'], ['Share beautifully', 'Every recipe gets a public page with macros and one-tap logging. Share meals like playlists.']].map(([t, d]) => /*#__PURE__*/React.createElement(Glass, {
    key: t,
    hover: true,
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-chip)',
      background: 'var(--sand-100)',
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--sand-900)'
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0 0',
      fontSize: 14,
      lineHeight: 1.65,
      color: 'var(--sand-500)'
    }
  }, d)))))));
}
function DailySnapshot() {
  const meals = [['Overnight Oats', 420], ['Chicken Shawarma Bowl', 520], ['Greek Yogurt', 130], ['Salmon Poke Bowl', 480]];
  const total = 1550,
    goal = 2200,
    pct = total / goal * 100;
  return /*#__PURE__*/React.createElement(Glass, {
    strong: true,
    style: {
      padding: 20,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--sand-900)'
    }
  }, "Today"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--sand-400)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, goal - total, " cal remaining")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      height: 8,
      borderRadius: 9999,
      background: 'var(--sand-200)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 9999,
      width: pct + '%',
      background: 'linear-gradient(to right, var(--blush-300), var(--blush-400))'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, meals.map(([n, c]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      background: 'rgba(250,249,247,0.5)',
      padding: '8px 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--sand-700)'
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--sand-400)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, c, " cal")))));
}
function Recipes({
  go
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
      padding: '80px 24px 64px'
    }
  }, /*#__PURE__*/React.createElement(Blobs, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 720,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Label, {
    style: {
      marginBottom: 24
    }
  }, "Log-Native Recipes"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 56,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.08,
      color: 'var(--sand-900)'
    }
  }, "Cook once.", /*#__PURE__*/React.createElement("br", null), "Log forever."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '24px auto 0',
      maxWidth: 560,
      fontSize: 18,
      lineHeight: 1.65,
      color: 'var(--sand-500)'
    }
  }, "Every recipe is a reusable template with precise macros baked in. Share your favorites with beautiful public pages that anyone can save and log."))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--sand-100)',
      padding: '64px 24px 96px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1152,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 24
    }
  }, RECIPES.map(r => /*#__PURE__*/React.createElement(RecipeTile, {
    key: r.id,
    r: r
  })))));
}
function Dashboard() {
  const [sel, setSel] = useState(new Set(['eggs', 'chicken']));
  const [logged, setLogged] = useState(false);
  const toggle = id => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };
  const foods = [['Chicken Breast (grilled)', '100g cooked · USDA verified', 165, 31, 0, 3.6], ['Brown Rice', '1 cup cooked', 215, 5, 45, 1.8], ['Avocado', '100g', 160, 2, 9, 15], ['Greek Yogurt (2%)', '170g', 130, 17, 8, 3.5]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--sand-100)',
      minHeight: '70vh',
      padding: '48px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Label, {
    style: {
      marginBottom: 8
    }
  }, "Product preview"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 24px',
      fontSize: 30,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: 'var(--sand-900)'
    }
  }, "Today's log"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-glass)',
      border: '1px solid var(--glass-border)',
      background: 'rgba(255,255,255,0.5)',
      boxShadow: 'var(--shadow-float)',
      backdropFilter: 'blur(8px)',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 8px',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--sand-400)'
    }
  }, "Quick log"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24
    }
  }, QUICKLOG.map(q => {
    const on = sel.has(q.id);
    return /*#__PURE__*/React.createElement("button", {
      key: q.id,
      onClick: () => toggle(q.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 9999,
        padding: '8px 16px',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all .2s var(--ease-out)',
        transform: on ? 'scale(0.97)' : 'scale(1)',
        border: `1px solid ${on ? 'var(--sage-300)' : 'var(--sand-200)'}`,
        background: on ? 'var(--sage-100)' : 'rgba(255,255,255,0.7)',
        color: on ? 'var(--sage-400)' : 'var(--sand-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, q.emoji), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, q.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: on ? 'var(--sage-400)' : 'var(--sand-400)'
      }
    }, q.cal), on && /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "3.5 8.5 6.5 11.5 12.5 5.5"
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Glass, {
    strong: true,
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(CalorieRing, {
    current: 1640,
    goal: 2200
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [['Protein', 132, 180, 'var(--macro-protein)'], ['Carbs', 165, 240, 'var(--macro-carbs)'], ['Fat', 58, 75, 'var(--macro-fat)']].map(([l, cur, g, col]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--sand-600)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--sand-400)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, cur, "g / ", g, "g")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 9999,
      background: 'var(--sand-200)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 9999,
      width: `${cur / g * 100}%`,
      background: col
    }
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, foods.map(([n, a, cal, p, c, f]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 12,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--sand-900)'
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--sand-500)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, cal, " cal")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--sand-400)',
      margin: '2px 0 6px'
    }
  }, a), /*#__PURE__*/React.createElement(MacroBar, {
    p: p,
    c: c,
    f: f
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setLogged(true);
      setTimeout(() => setLogged(false), 2200);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 48,
      minWidth: 160,
      justifyContent: 'center',
      borderRadius: 9999,
      padding: '0 32px',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      border: 'none',
      transition: 'all .3s var(--ease-out)',
      background: logged ? 'var(--sage-200)' : 'var(--sand-900)',
      color: logged ? 'var(--sage-400)' : 'var(--sand-50)',
      transform: logged ? 'scale(0.97)' : 'scale(1)'
    }
  }, logged ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "4 10.5 8 14.5 16 6.5"
  })), "Logged") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "3",
    x2: "8",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "8",
    x2: "13",
    y2: "8"
  })), "Log Meal"))))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: '1px solid var(--sand-200)',
      background: 'var(--sand-50)',
      padding: '40px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1152,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Logo, null), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--sand-400)'
    }
  }, "\xA9 2026 Savoro. Recipes and logging, the same thing.")));
}
function App() {
  const [route, setRoute] = useState('home');
  const go = r => {
    setRoute(r);
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      background: 'var(--sand-50)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    route: route,
    go: go
  }), route === 'home' && /*#__PURE__*/React.createElement(Home, {
    go: go
  }), route === 'recipes' && /*#__PURE__*/React.createElement(Recipes, {
    go: go
  }), route === 'app' && /*#__PURE__*/React.createElement(Dashboard, null), /*#__PURE__*/React.createElement(Footer, null));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/savoro/screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.GlassCard = __ds_scope.GlassCard;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.CalorieRing = __ds_scope.CalorieRing;

__ds_ns.FoodCard = __ds_scope.FoodCard;

__ds_ns.MacroBar = __ds_scope.MacroBar;

__ds_ns.QuickLogChip = __ds_scope.QuickLogChip;

__ds_ns.RecipeCard = __ds_scope.RecipeCard;

})();
