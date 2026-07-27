# Naqalchi Design System & Developer Guidelines

This document serves as the absolute source of truth for the Naqalchi UI/UX design, typography, color tokens, and layout guidelines. All subsequent agents and developers **must adhere strictly** to the systems documented below. Do not change, override, or deviate from these variables and patterns.

---

## 1. Core Palette & Color Tokens

Our core color engine utilizes a desaturated, highly premium, organic Sage-Mint theme combined with crisp dark values.

| Variable | Hex / CSS Value | Description / Usage |
| :--- | :--- | :--- |
| `--bg-app` | `#f2f8f6` | Main full-viewport background color |
| `--bg-sidebar` | `#e5edea` | Light, desaturated Sage-Mint sidebar background |
| `--bg-card` | `#ffffff` | Pure white background for container blocks and cards |
| `--bg-pill-active` | `#bfe5df` | Active badge/pill background |
| `--bg-pill-hover` | `#e8f5f2` | Hover state background for pills and items |
| `--text-dark` | `#3d524e` | Dark Slate-Mint for primary headers, titles, and body texts |
| `--text-muted` | `#6e807c` | Medium desaturated Slate for secondary subtitles and metadata |
| `--accent-dark` | `#3c5c56` | Primary corporate Slate-Green for active actions and dark buttons |
| `--accent-dark-hover` | `#4c736a` | Hover state for primary buttons |
| `--accent-light` | `#f5faf8` | Very soft pale teal for card highlights and status indicators |
| `--border-color` | `rgba(15, 28, 26, 0.08)` | Super thin divider lines, borders, and input strokes |

---

## 2. Symmetrical Typography Reset

To prevent visual drift across different pages and platform environments, the following rules apply globally.

### Import Configuration
We load standard Google Fonts via `index.html`:
* **Title Font:** `Outfit` (Weights: `400`, `500`, `600`, `700`)
* **Body Font:** `Inter` (Weights: `400`, `500`, `600`)

### Font Assignments
* `--font-title`: `'Outfit', 'Inter', sans-serif`
* `--font-body`: `'Inter', sans-serif`

> [!IMPORTANT]
> **Form Control Typography Reset:**
> Because HTML form elements (like `button`, `input`, `textarea`, and `select`) do not inherit font families by default in standard browser engines, we enforce the following global reset in `src/index.css` to prevent fallback Arial/Segoe UI render glitches:
> ```css
> button, input, textarea, select {
>   font-family: inherit;
> }
> ```

---

## 3. Page Structure & Header Consistency

Both the **Voice Studio** and **Manage Team Personas** views must utilize the identical wrapper classes, padding, and font metrics:

```typescript
// Symmetrical Page Layout Wrapper
<div className="persona-admin-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
  <div className="persona-admin-header" style={{ marginBottom: '64px' }}>
    <div>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700', color: 'var(--text-dark)' }}>
        [Page Title Here]
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
        [Descriptive subtitle outlining the user's primary action]
      </p>
    </div>
    {/* Optional trailing elements, such as action buttons, align here */}
  </div>

  {/* Rest of Page Content Rendered Here */}
</div>
```

---

## 4. Persona Avatar Gradients & Colliding Protection

The roster utilizes a stable, non-colliding algorithm to distribute five beautiful pastel gradients sequentially. The first card (Prince) **must always** be styled with Lavender.

### The Five-Gradient Palette

1. **Gradient 0 (Lavender):**
   * Background: `linear-gradient(135deg, #ffd3e8 0%, #bfa8e6 100%)`
   * Box-Shadow: `rgba(191, 168, 230, 0.22)`
   * Outer-Border Glow: `rgba(255, 211, 232, 0.35)`
2. **Gradient 1 (Mint-Green):**
   * Background: `linear-gradient(135deg, #d2f1eb 0%, #87cbd0 100%)`
   * Box-Shadow: `rgba(135, 203, 208, 0.22)`
   * Outer-Border Glow: `rgba(210, 241, 235, 0.35)`
3. **Gradient 2 (Ice-Blue):**
   * Background: `linear-gradient(135deg, #e0f2fe 0%, #9bc5fb 100%)`
   * Box-Shadow: `rgba(155, 197, 251, 0.22)`
   * Outer-Border Glow: `rgba(224, 242, 254, 0.35)`
4. **Gradient 3 (Dusty Peach):**
   * Background: `linear-gradient(135deg, #ffdcd0 0%, #fca49b 100%)`
   * Box-Shadow: `rgba(252, 164, 155, 0.22)`
   * Outer-Border Glow: `rgba(255, 220, 208, 0.35)`
5. **Gradient 4 (Champagne-Grey):**
   * Background: `linear-gradient(135deg, #f5f5f5 0%, #c4cbd0 100%)`
   * Box-Shadow: `rgba(196, 203, 208, 0.22)`
   * Outer-Border Glow: `rgba(245, 245, 245, 0.35)`

### Symmetrical Distribution Rules
To prevent adjacent cards from rendering identical background styles, map color distributions cleanly using the stable hashing logic:

```typescript
const getStableIndex = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

let colorIndex = getStableIndex(persona.id || persona.name) % gradients.length;

if (index === 0) {
  colorIndex = 0; // Force Lavender for first roster card
} else if (colorIndex === lastColorIndex) {
  colorIndex = (colorIndex + 1) % gradients.length; // Shift index to avoid consecutive collisions
}
lastColorIndex = colorIndex;
```

---

## 5. Quick-Test Reference Scripts

When testing synthesis engines, use the following pre-selected sentences:
1. **Podcast Preset:** *“I sound so good that I think I should start my own podcast, go on tour, and retire by next Tuesday.”*
2. **Shower Song Preset:** *“I can say absolutely anything you want me to say. Yes, even that embarrassing song you sing in the shower.”*
3. **Great Work Preset:** *“The only way to do great work is to love what you do.”*
4. **Be Yourself Preset:** *“Be yourself; everyone else is already taken.”*
5. **Invent Future Preset:** *“The best way to predict the future is to invent it. Let's build something incredible today.”*

---

## 6. Brand Logo Specifications

The brand logo is a highly customized vector emblem that represents the Naqalchi brand identity. Under no circumstances should this emblem be modified, stretched, or replaced with raster assets (like PNG/JPG).

### Logo Dimensions & CSS Classes
* **Container Class:** `.brand-logo`
* **Sizing:** `44px` by `44px`
* **Border Radius:** `12px`
* **Box-Shadow:** `0 4px 12px rgba(0, 128, 102, 0.15)`

### Vector Source Blueprint (SVG)
The logo is drawn using a high-fidelity vector path combining a spade-shaped organic outline on top of a vibrant Mint-Teal radial aura (`spadeAuraGlow`):

```xml
<svg viewBox="0 0 100 100" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="spadeAuraGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#00f5c4" stopOpacity="1" />
      <stop offset="40%" stopColor="#00b894" stopOpacity="1" />
      <stop offset="80%" stopColor="#008066" stopOpacity="1" />
      <stop offset="100%" stopColor="#005c4d" stopOpacity="1" />
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#spadeAuraGlow)" />
  <path d="M50 15C47 15 22 36 22 52C22 61 29 65 39.5 65C44 65 47.5 63 50 60C52.5 63 56 65 60.5 65C71 65 78 61 78 52C78 36 53 15 50 15Z" fill="#060c0b" />
  <path d="M50 56Q48 65 44 76.5H56Q52 65 50 56Z" fill="#060c0b" />
</svg>
```

