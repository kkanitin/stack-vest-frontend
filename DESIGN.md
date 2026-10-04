---
name: StackVest Design System
colors:
  background: '#0b1326'
  surface: '#0b1326'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c0c8ca'
  outline: '#8a9294'
  primary: '#a1ced9'
  on-primary: '#00363f'
  primary-container: '#2d5a64'
  success: '#4ade80'
  warning: '#f2bb95'
  error: '#ffb4ab'
  series-1: '#3987e5'
  series-2: '#d95926'
  series-3: '#199e70'
  series-4: '#c98500'
  series-5: '#d55181'
  series-other: '#5f6b85'
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
    letterSpacing: -0.01em
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
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1440px
---

# Design System: StackVest

Extracted from the frontend source (`src/index.css`, `src/components/ui/`, and the page and component stylesheets). The code is the source of truth for this document.

## 1. Visual Theme & Atmosphere

A dark-default, "quietly premium" investment dashboard: cool navy-slate surfaces, one muted teal accent, and monospaced figures. Depth comes from stacked surface tones and hairline borders rather than heavy shadows. Density is moderate: generous `24px` to `40px` outer padding around tight `8px` to `16px` data rows. A light variant exists and follows the operating system setting (`prefers-color-scheme: light`); it is derived from the dark palette rather than separately designed.

## 2. Color Palette & Roles

### Primary Foundation
- **Midnight Slate (`#0b1326`)**: Page background and topbar.
- **Sidebar Slate (`#131b2e`)**: Sidebar and muted fills.
- **Panel Slate (`#171f33`)**: Card surface.
- **Raised Slate (`#222a3d`)**: Hover fills, popovers, secondary buttons, inline code.
- **Selected Slate (`#2d3449`)**: Active navigation item.
- **Hairline (`rgba(255, 255, 255, 0.06)`)**: Default `1px` borders and row dividers; **Strong Hairline (`rgba(255, 255, 255, 0.12)`)** for inputs and hovered outlines.

### Accent & Interactive
- **Mist Teal (`#a1ced9`)**: Primary buttons, focus rings, active icons, and the active navigation indicator. Text on it is **Deep Teal Ink (`#00363f`)**.
- **Slate Teal (`#2d5a64`)**: Primary container tone, and the primary accent in the light variant.
- **Teal Wash (`rgba(161, 206, 217, 0.10)` fill, `0.30` border)**: Tinted primary badges.

### Typography & Text Hierarchy
- **Ice White (`#dae2fd`)**: Headings, figures, and emphasized text.
- **Soft Grey (`#c0c8ca`)**: Body text.
- **Dim Grey (`#8a9294`)**: Labels, captions, timestamps, and idle icons.

### Functional States
- **Gain Green (`#4ade80`)**: Gains and success, with a `10%` fill and `30%` border for badges.
- **Loss Coral (`#ffb4ab`)**: Losses, errors, and destructive actions, with the same `10%` / `30%` tint pattern.
- **Warm Sand (`#f2bb95`)**: Warnings.
- **Chart series, in fixed order**: `#3987e5`, `#d95926`, `#199e70`, `#c98500`, `#d55181`, then `#5f6b85` for "other". These identify categories only and are kept separate from gain and loss colors.

### Light Variant
Background `#f3f5fb`, cards `#ffffff`, headings `#0d1426`, body `#3c4760`, dim `#6b7388`, primary `#2d5a64` with white text, gain `#16a34a`, loss `#b3261e`, warning `#b76f3b`. The sidebar stays dark (`#11192b`).

## 3. Typography Rules

- **Geist Variable**: All interface text. Display `600` at `48px/1.1` with `-0.02em` tracking (`38px` at `1024px` and below); headline `500` at `24px/1.3` with `-0.01em`; subheading `500` at `18px/1.4`; body `400` at `16px/1.6`; small body `400` at `14px/1.5`; uppercase labels `600` at `12px/1` with `0.05em` tracking in Dim Grey.
- **JetBrains Mono** (`400`, `500`, `600`): Every financial figure, percentage, ticker symbol, and timestamp. Large data `500` at `20px/1.2`; table data `500` at `14px/1.2`; the hero portfolio value runs `32px` to `48px` at `500` with `-0.02em` tracking.
- **Base size**: `16px`, dropping to `15px` at `1024px` and below and `14px` at `767px` and below.

## 4. Component Stylings

- **Buttons**: `36px` tall, `16px` horizontal padding, `14px` medium text, `2px` radius. Primary is a Mist Teal fill with Deep Teal Ink text, dimming to `90%` on hover. Secondary is a Raised Slate fill with Ice White text. Outline is a `1px` Strong Hairline border over a faint fill. Ghost shows a Raised Slate fill only on hover. Destructive is Loss Coral. Focus shows a `3px` Mist Teal ring at `50%` opacity. Sizes run `24px`, `32px`, `36px`, and `40px`.
- **Cards**: Panel Slate fill, `1px` Hairline border, `8px` radius, `24px` padding with `24px` gaps between sections, and a very light shadow.
- **Navigation**: `260px` Sidebar Slate column with a `1px` right border. Links are `14px` medium with `10px 12px` padding and `8px` radius; hover is Raised Slate; the active link is Selected Slate with Ice White text, a teal icon, and a `2px` Mist Teal bar on the sidebar's right edge. The topbar has `18px 40px` padding, a bottom Hairline, and `32px` square icon buttons with `4px` radius.
- **Inputs**: `36px` tall, `2px` radius, `1px` Strong Hairline border over a faint fill, Dim Grey placeholder. Focus turns the border Mist Teal and adds the `3px` ring; invalid fields use Loss Coral.
- **Badges**: Pill-shaped (`9999px`), `12px` medium text, `2px 8px` padding. Tinted tones (neutral, primary, success, error, warning) use a `10%` fill with a `30%` border of the tone color.
- **Dialogs**: Midnight Slate panel, `1px` border, `4px` radius, `24px` padding, over a `50%` black overlay; maximum width `512px` by default.
- **Data tables**: Headers are `11px` medium uppercase with `0.08em` tracking in Dim Grey; cells have `16px` padding; rows are separated by `1px` Hairline dividers; numeric columns are right-aligned in JetBrains Mono.
- **Allocation donut**: `160px` ring with a centered mono figure and a legend of `10px` square swatches, mono symbols, and percentages, colored from the chart series in order.

## 5. Layout Principles

- **Shell**: Fixed `260px` sidebar plus a fluid main column. Content is capped at `1440px`, centered, with `40px` padding.
- **Grid & spacing**: `4px` base unit and `24px` gaps between cards and rows. The overview uses a `2fr 1fr` hero row, a `1fr 2fr` holdings row, and a three-column supporting row. Card collections use auto-fill columns with a `320px` minimum.
- **Responsive behavior**: At `1360px` and below, three-column rows drop to two. At `1024px` and below, the sidebar moves off-canvas behind a hamburger with a `50%` black backdrop, rows collapse to one column, and padding becomes fluid (`16px` to `40px`). At `767px` and `640px` and below, layouts stack fully and touch targets are at least `44px`.
- **Motion**: Short `150ms` to `200ms` color and transform transitions; no decorative animation.

## 6. Design System Notes for Stitch Generation

- **Atmosphere keywords**: Quietly premium, dark navy-slate, tonal layering, hairline borders, muted teal accent, monospaced financial data, calm institutional dashboard.
- **Canonical colors**: Midnight Slate `#0b1326`, Sidebar Slate `#131b2e`, Panel Slate `#171f33`, Raised Slate `#222a3d`, Mist Teal `#a1ced9`, Ice White `#dae2fd`, Soft Grey `#c0c8ca`, Dim Grey `#8a9294`, Gain Green `#4ade80`, Loss Coral `#ffb4ab`.
- **Component prompts**: A `260px` dark sidebar with `8px` rounded links and a thin teal active bar; Panel Slate cards with `1px` hairline borders, `8px` radius, and `24px` padding; `36px` tall Mist Teal buttons with dark teal text and `2px` corners; tables with small uppercase grey headers and right-aligned JetBrains Mono figures colored green for gains and coral for losses.
