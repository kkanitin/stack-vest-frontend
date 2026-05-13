# UI Review Checklist

Use this checklist before submitting any UI-related changes to ensure consistency with the StackVest design language.

## 1. Typography & Readability
- [ ] Are headings using `Inter`?
- [ ] Are headings using negative letter-spacing (`-0.01em` to `-0.04em`)?
- [ ] Are numbers and technical data using `JetBrains Mono`?
- [ ] Is the font weight appropriate (e.g., 600 for headings)?

## 2. Theming & Colors
- [ ] Are all colors using CSS variables from `src/index.css`?
- [ ] Does the component look correct in **Light Mode**?
- [ ] Does the component look correct in **Dark Mode**?
- [ ] Is there sufficient contrast between text and background?

## 3. Shapes & Spacing
- [ ] Do interactive elements (buttons, links) have an `8px` border radius?
- [ ] Do small accents (badges, code blocks) have a `4px` or `6px` radius?
- [ ] Is the spacing consistent with the existing layout (e.g., `3rem` padding for main content)?
- [ ] Is alignment precise and purposeful?

## 4. Interactions & Motion
- [ ] Do hover states include a `200ms cubic-bezier` transition?
- [ ] Do interactive elements have a subtle `translateY(-1px)` lift on hover?
- [ ] Do interactive elements have a subtle shadow on hover?

## 5. Mobile & Responsiveness
- [ ] Does the UI adapt gracefully to smaller screen sizes?
- [ ] Is the 280px sidebar handled correctly (e.g., sticky or hidden on small screens)?
