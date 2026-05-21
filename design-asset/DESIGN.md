---
name: StackVest Design System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c0c8ca'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8a9294'
  outline-variant: '#40484a'
  surface-tint: '#a1ced9'
  primary: '#a1ced9'
  on-primary: '#00363f'
  primary-container: '#2d5a64'
  on-primary-container: '#a2d0db'
  inverse-primary: '#38656f'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#f2bb95'
  on-tertiary: '#49280d'
  tertiary-container: '#734b2d'
  on-tertiary-container: '#f4bd97'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bceaf6'
  primary-fixed-dim: '#a1ced9'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#1e4d57'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#f2bb95'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#643e21'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.2'
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1440px
---

## Brand & Style
This design system embodies a "Quietly Premium" aesthetic, specifically tailored for the sophisticated retail crypto investor. The visual direction moves away from the frenetic, neon-heavy tropes of the crypto industry, opting instead for a balanced, institutional-grade atmosphere that inspires confidence and calm.

The style is a fusion of **Modern Corporate** and **Minimalism**. It prioritizes high-density data visualization without the clutter, utilizing ample negative space and a rigorous grid to ensure clarity. Every element is designed to feel precise, intentional, and high-value, moving the user from speculative anxiety to structured wealth management.

## Colors
The palette is restrained and sophisticated. The primary accent is a **Deep Slate Teal**, providing a confident but muted touch of color that distinguishes the brand from generic fintech blues.

- **Primary:** Deep Slate Teal (#2D5A64) for key actions and brand presence.
- **Neutrals:** A range of deep slates and charcoals. The background uses a near-black slate to reduce eye strain during long sessions, while surfaces use a slightly lighter charcoal to create depth.
- **Semantic:** Success and gains are represented by a clear **Emerald Green**, while losses use a warm **Coral**. Both are tuned for accessibility against dark backgrounds, ensuring they remain legible and distinct without being over-stimulating.

## Typography
The typography strategy employs a dual-font approach to balance human-centric UI with technical precision.

1.  **Interface UI (Geist):** Used for all navigational elements, headers, and descriptive text. Its clean, geometric sans-serif nature feels modern and trustworthy.
2.  **Data & Metrics (JetBrains Mono):** All financial figures, wallet addresses, and percentages must use the monospaced font. This ensures that columns of numbers align perfectly in tables, allowing the eye to scan for magnitude and changes instantly without visual "jitter" from variable-width characters.

**Mobile Scaling:** Headlines larger than 24px should scale down by 20% on mobile devices to maintain layout integrity. Data points should maintain their size for legibility, utilizing horizontal scrolling for tables where necessary.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main content area is capped at 1440px to ensure line lengths remain readable on ultra-wide monitors, while smaller viewports use a fluid 12-column grid.

- **Rhythm:** All spacing is based on a 4px base unit.
- **Data Density:** Use "Generous Padding" (24px+) for container exteriors to create a premium feel, but "Tight Internal Spacing" (8px-12px) within data tables and list items to maintain information density.
- **Grid:** On desktop, a 12-column grid with 24px gutters. On mobile, a 4-column grid with 16px gutters.
- **Sidebar:** A fixed-width left navigation (260px) is preferred for the dashboard to provide a stable anchor for the user experience.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional drop shadows. This maintains the "Quietly Premium" aesthetic without the clutter of heavy blurs.

- **Level 0 (Background):** Deepest slate, purely structural.
- **Level 1 (Cards/Panels):** Slightly lighter slate with a 1px solid border (hex: #ffffff10).
- **Level 2 (Popovers/Modals):** Lighter still, with a very subtle 16px ambient shadow (#00000040) to separate it from the main dashboard surface.
- **Active States:** Subtle inner-glows or 1px primary-colored borders indicate focus or selection, avoiding heavy "glow" effects.

## Shapes
The shape language is "Soft" and professional. A standard radius of **4px (0.25rem)** is used for most UI components (inputs, buttons, cards) to provide a modern feel that isn't overly aggressive or "bubbly."

- **Buttons:** 4px radius.
- **Large Cards:** 8px (0.5rem) radius for a slightly softer container feel.
- **Badges:** Fully rounded (pill-shaped) for "Beta" or "New" status tags to distinguish them from interactive buttons.

## Components

### Buttons
Primary buttons use the Deep Slate Teal with white text. Secondary buttons use a subtle outline or a ghost style. Hover states should be a gentle shift in background luminosity (+5% brightness), never a dramatic color change.

### Cards
Cards are the primary container for data. They should feature a 1px border in a low-contrast grey-slate. Headers within cards should use `label-caps` for a structured, editorial look.

### Data Tables
Tables are the heart of the dashboard. Use `data-md` (JetBrains Mono) for all numeric values. Row dividers should be thin and subtle (#ffffff05). Hovering over a row should trigger a slight background highlight to assist in horizontal scanning.

### Input Fields
Inputs should be dark-filled with a subtle border. The focus state uses a 1px Deep Slate Teal border and a very soft outer glow. Use monospaced fonts for numerical input fields (e.g., "Amount to Invest").

### Beta Badges
Small, pill-shaped tags with a 1px border. Use a muted version of the primary teal or a neutral silver. Avoid bright colors for badges to keep the focus on the actual financial data.

### Progress Bars & Gauges
Used for portfolio allocation. Use the primary slate-blue for the "filled" portion and a very dark charcoal for the track. Transitions between data states should be smooth and dampened (300ms ease-in-out).