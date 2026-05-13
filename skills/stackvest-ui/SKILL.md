# StackVest UI Skill

This skill provides guidelines and resources for implementing the StackVest design language. It is intended for use by AI agents (Junie, Claude Code, etc.) and human developers to ensure visual consistency and adherence to core design principles.

## Core Principles

- **Clarity over Decoration**: UI elements must serve a functional purpose. Minimize decorative elements.
- **Precision**: Use consistent spacing and alignment to convey trust and accuracy, especially in data visualizations.
- **Technical Aesthetic**: Inspired by developer tools, using monospaced fonts for technical data and subtle "grid" or "tick" motifs.
- **Theming**: Full support for Light and Dark modes using CSS variables defined in `src/index.css`.

## Design Tokens

### Typography
- **Sans/Heading**: `Inter` (system-fallback) with tight letter-spacing (`-0.01em` to `-0.04em`).
- **Monospace**: `JetBrains Mono` for technical data, numbers, and code snippets. Use for all financial figures.

### Colors
Use CSS variables for all colors to ensure theme support:
- **Accent**: `--accent` (Indigo: `#6366f1` Light, `#818cf8` Dark).
- **Backgrounds**: `--bg` (White Light, Deep Navy Dark).
- **Text**: `--text` for body, `--text-h` for headings and emphasis.
- **Borders**: `--border` (Subtle Slate).

### Shapes
- **Interactive Elements**: `8px` border radius (buttons, nav links).
- **Small Accents**: `4px` or `6px` radius (code blocks, badges).

## UI Patterns

- **Layout**: 280px sidebar for navigation, spacious main content area (3rem padding).
- **Interactions**: Smooth transitions (`200ms cubic-bezier`) with subtle lifts (`translateY(-1px)`) and shadows on hover for interactive elements.
- **Visual Cues**: Use of emojis/icons for navigation and clear "Beta" badges for experimental features.

## Resources

- [UI Review Checklist](./checklist.md)
- [Templates](./templates/)

## Usage for Agents

When tasked with creating or modifying UI components:
1. Review the `index.css` for available CSS variables.
2. Ensure typography follows the Sans/Mono split.
3. Apply the 8px border radius to buttons and inputs.
4. Verify both Light and Dark mode appearances.
5. Use the [UI Review Checklist](./checklist.md) before submitting.
