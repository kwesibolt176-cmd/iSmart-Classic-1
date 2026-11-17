# UI/UX Pro Max Guidelines

This document contains the core design guidelines, anti-patterns, and pre-delivery checks extracted from the UI-UX Pro Max skill. These rules ensure a professional, polished, and accessible user interface.

## 1. Common Rules for Professional UI

### Icons & Visual Elements
| Rule | Standard | Avoid | Why It Matters |
|------|----------|--------|----------------|
| **No Emoji as Structural Icons** | Use vector-based icons (`lucide-react`, `heroicons`, etc.). | Using emojis (🎨 🚀 ⚙️) for navigation, settings, or system controls. | Emojis are font-dependent, inconsistent across platforms, and cannot be controlled via design tokens. |
| **Vector-Only Assets** | Use SVG or platform vector icons that scale cleanly. | Raster PNG icons that blur or pixelate. | Ensures scalability, crisp rendering, and dark/light mode adaptability. |
| **Stable Interaction States** | Use color, opacity, or elevation transitions for press states. | Layout-shifting transforms that move surrounding content. | Prevents unstable interactions and preserves smooth motion. |
| **Consistent Icon Sizing** | Define icon sizes as design tokens (e.g., `w-4 h-4` = 16px, `w-6 h-6` = 24px). | Mixing arbitrary values randomly. | Maintains rhythm and visual hierarchy across the interface. |
| **Filled vs Outline Discipline** | Use one icon style per hierarchy level. | Mixing filled and outline icons at the same level. | Maintains semantic clarity and stylistic coherence. |
| **Touch Target Minimum** | Minimum 44×44pt interactive area for critical actions. | Small icons without expanded tap area. | Meets accessibility and platform usability standards. |

### Interaction & Feedback
| Rule | Do | Don't |
|------|----|----- |
| **Tap feedback** | Provide clear pressed feedback (hover/opacity/elevation) within 80-150ms | No visual response on tap |
| **Animation timing** | Keep micro-interactions around 150-300ms | Instant transitions or slow animations (>500ms) |
| **Disabled state clarity** | Use reduced emphasis and `cursor-not-allowed` | Controls that look tappable but do nothing |
| **Semantic native controls** | Prefer native interactive primitives (`<button>`, `<a href>`) | Generic `<div>` containers used as primary controls without role/tabindex |

### Light/Dark Mode Contrast
| Rule | Do | Don't |
|------|----|----- |
| **Surface readability** | Keep cards/surfaces clearly separated from background with borders or elevation | Overly transparent surfaces that blur hierarchy |
| **Text contrast** | Maintain body text contrast >=4.5:1 | Low-contrast gray body text |
| **Border visibility** | Ensure separators are visible in both themes | Theme-specific borders disappearing in dark mode |
| **State contrast parity** | Keep pressed/focused/disabled states equally distinguishable in both themes | Defining interaction states for light theme only |

### Layout & Spacing
| Rule | Do | Don't |
|------|----|----- |
| **4/8pt spacing rhythm** | Use a consistent 4/8pt spacing system (Tailwind `gap-2`, `p-4`, etc.) | Random spacing increments with no rhythm |
| **Readable text measure** | Keep long-form text readable (max ~65-75 characters wide) | Full-width long text on large monitors |
| **Consistent content width** | Keep predictable content max-width (e.g., `max-w-7xl mx-auto`) | Mixing arbitrary widths between screens |

---

## 2. Pre-Delivery Checklist

Before finalizing any UI component or page, strictly verify these items:

### Visual Quality
- [ ] No emojis used as icons (use SVG/Lucide instead).
- [ ] All icons come from a consistent icon family (e.g. `lucide-react`).
- [ ] Hover and pressed-state visuals do not shift layout bounds or cause jitter.
- [ ] Semantic theme tokens (Tailwind classes) are used consistently.

### Interaction
- [ ] `cursor-pointer` is applied to all clickable elements.
- [ ] Micro-interaction timing stays in the 150-300ms range (e.g. `transition-all duration-200`).
- [ ] Disabled states are visually clear and non-interactive (`opacity-50 cursor-not-allowed`).
- [ ] Focus states are visible for keyboard navigation (`focus:ring-2`, `focus:outline-none`).

### Light/Dark Mode
- [ ] Both themes are explicitly tested (ensure dark mode tailwind classes `dark:bg-xxx` are implemented).
- [ ] Text contrast >=4.5:1 against surfaces in both modes.

### Layout & Spacing
- [ ] Responsive design implemented correctly across mobile (`sm:`), tablet (`md:`), and desktop (`lg/xl:`).
- [ ] 4/8pt spacing rhythm is maintained across component and page levels.

---

## 3. Design System Hierarchy Pattern (Master + Overrides)

When generating new pages or features, remember the hierarchical design system rule:
1. **Master System**: Rely on the global UI/UX tokens in the app (e.g. `globals.css` or Tailwind config).
2. **Page-Specific Deviations**: If a specific page requires a deviation (like a landing page needing a distinct hero section), specify its design tokens distinctly but without breaking the master token system.
