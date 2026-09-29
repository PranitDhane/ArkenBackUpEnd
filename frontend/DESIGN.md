# ARKEN Design System

Two visual registers. Never mix them.

## 1. Homepage (Light)

The marketing page. Light, readable, makes dark product screenshots pop.

### Color Tokens (`index.css` `.homepage` scope)

| Token | Value | Use |
|-------|-------|-----|
| `--hp-bg` | `#f8f9fb` | Page background |
| `--hp-bg-alt` | `#f1f3f7` | Alternating section bg |
| `--hp-surface` | `#ffffff` | Cards, nav on scroll |
| `--hp-text` | `#0f1117` | Primary text |
| `--hp-muted` | `#6b7280` | Body text, labels (WCAG AA on white) |
| `--hp-subtle` | `#9ca3af` | Decorative text only — NOT for body copy (fails contrast) |
| `--hp-border` | `#e5e7eb` | Dividers, card borders |
| `--hp-accent` | `#f59e0b` | Amber — primary CTA, engineering data |
| `--hp-accent-blue` | `#3b82f6` | Blue — running states, AI accent |
| `--hp-success` | `#22c55e` | Approved states |
| `--hp-terminal-bg` | `#1a1d27` | Dark terminal cards on light bg |
| `--hp-terminal-border` | `#2a2d3a` | Terminal card borders |
| `--hp-terminal-dim` | `#4b5563` | Dim text inside terminal cards |

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display headers | DM Serif Display | 48–64px (`clamp`) | 400 |
| Section headers | DM Serif Display | 28–44px | 400 |
| Body | Inter | 14–16px | 400 |
| Labels/nav | Inter | 12–14px | 500 |
| Data values | JetBrains Mono | 11–13px | 400 |

**Rule:** Use `#6b7280` (not `#9ca3af`) for body-size text on light backgrounds. `#9ca3af` is decorative only.

### Mesh Gradient Recipe

```css
radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.25) 0%, transparent 60%),
radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.15) 0%, transparent 60%)
```
`filter: blur(48px)` always. Never use solid colored backgrounds behind product screenshots.

### Responsive Grid Classes (`<style>` in HomePage.jsx)

| Class | Desktop | Mobile (≤768px) |
|-------|---------|-----------------|
| `.hp-hero-grid` | `1fr 1fr` | `1fr` |
| `.hp-two-col` | `1fr 1fr` | `1fr` |
| `.hp-three-col` | `repeat(3, 1fr)` | `1fr` |
| `.hp-problem-grid` | `1fr auto 1fr` | `1fr` |
| `.hp-testimonials-grid` | `1fr 1fr` | `1fr` |
| `.hp-annotation-cards` | visible | `display: none` |
| `.hp-nav-links` | visible | `display: none` |

### Animation Budget

| Element | Technique | Timing |
|---------|-----------|--------|
| Section reveals | Framer Motion `whileInView` + `fadeUp` preset | 0.5s ease-out |
| Hero pipeline steps | `setInterval` + opacity transition | 2s interval |
| Annotation cards | Framer Motion `animate` with `delay` stagger | 0/0.4/0.8s |
| Confidence bar fill | Framer Motion `animate` width | 1.2s ease-in-out |
| Logo wall | CSS `@keyframes marquee` | 30s linear infinite |
| Chat typing | `setInterval` character append | 28ms/char user, 22ms/char AI |
| Nav scroll state | CSS `transition` | 300ms ease-out |

All animations respect `prefers-reduced-motion`. Chat section starts with full text when reduced motion is preferred.

### AI Slop Rules (Homepage)

**Never:**
- 3-column feature grid with icon-in-circle + 2-line description
- Generic hero copy ("Welcome to...", "Unlock the power of...")
- Emoji as design elements in body sections
- Purple/indigo gradient backgrounds
- Centered everything (only hero and section headers center — body text is left-aligned)

**The security section specifically:** Use inline SVG icons (`IconLock`, `IconShield`, `IconFile` in the component), never emoji.

---

## 2. App UI (Dark)

The engineering workspace. Dark terminal aesthetic. Defined in `:root` in `index.css`.

See `:root` in `src/index.css` for all dark theme tokens (`--color-bg`, `--color-surface`, etc.).

**Rule:** The app UI is dark by default (`html { color-scheme: dark }`). The homepage overrides this with `colorScheme: "light"` on the root div and the `.homepage` CSS class.

---

## Section Order (Homepage)

1. Nav (sticky, scroll-aware)
2. Hero (pipeline animation + annotation cards)
3. Logo wall (CSS marquee)
4. The Problem (before/after cards)
5. How It Works (3-step numbered grid) — `id="how-it-works"`
6A. Feature: Pipeline Transparency — `id="features"`
6B. Feature: Confidence Scoring
6C. Feature: HTRI Accuracy
6D. Feature: Conversational Interface (typing animation)
7. Testimonials
8. Security & Trust (SVG icons only)
9. FAQ (accordion, mutual exclusion)
10. CTA Footer (dark `#0f1117`)
