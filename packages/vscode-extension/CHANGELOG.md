# Changelog

## [0.8.5] - 2026-03-20

### Fixed
- All hardcoded SVG colors replaced with CSS variables for proper dark/light theme switching
  - ProgressRing: strokes now use `--radar-grid` and `--radar-stroke`
  - Dashboard radar chart: grid, axes, data area, and dots all theme-aware
  - AchievementBadge: locked badge border/background adapts to theme
  - SkillTree: rarity glow colors use `--rarity-epic-glow` / `--rarity-rare-glow`
  - SkillCard: undiscovered card border uses `chalk-border-light` instead of hardcoded gray

### Added
- CSS variables `--rarity-epic-glow`, `--rarity-rare-glow`, `--achievement-locked-border`, `--achievement-locked-bg` with dark and light variants
- GIF demo preview in README for marketplace listing

## [0.8.4] - 2026-03-20

### Changed
- Skill tree popup redesigned as a centered modal with dark blurred overlay instead of floating positional popup
  - Phase color accent bar at top of card
  - Stat boxes for Level, Uses, and Tools count
  - Full capabilities list and tools display
  - Spring scale-in animation with heavy drop shadow
- Inventory modal overlay improved — `rgba(0,0,0,0.6)` + `backdrop-filter: blur(8px)` for strong contrast in both themes
- Both modals now share the same visual pattern: dark blurred backdrop, centered card, spring animation

### Fixed
- Skill tree popup no longer appears in wrong position or off-screen
- Modal overlays now properly visible in light mode

## [0.8.3] - 2026-03-20

### Fixed
- Inventory modal now has a visible dark backdrop with blur — was invisible in light mode because `board-dark/80` resolved to near-white
- Skill tree popup repositioned to appear centered below the clicked node instead of floating far off to the side
- Close button (✕) in skill tree popup now renders as the actual character instead of literal `\u2715` text
- Modal backdrop uses `rgba(0,0,0,0.5)` + `backdrop-filter: blur(4px)` — works in both dark and light themes
- Added drop shadow to modal content for better visual separation

## [0.8.2] - 2026-03-20

### Fixed
- Theme toggle now actually switches between dark and light mode — CSS selectors were not matching the `data-theme` attribute with enough specificity; changed to `body[data-theme="light"]` to properly override variables

## [0.8.1] - 2026-03-20

### Changed
- **Skill Tree popup card** — clicking a skill now shows a floating popup next to the node (Diablo/WoW talent tree style) instead of a bottom panel that ate screen space
  - Popup appears to the right of the clicked node, or left if near the edge
  - Shows name, phase, rarity, version, description, level, usage count, capabilities, tools, and Record/Open buttons
  - Click outside or ✕ to dismiss
  - Spring animation on open/close
- **Light mode is now a white whiteboard** (`#ffffff`) instead of cream — clean, minimal, no dust or glow effects
- Dark mode stays black chalkboard (`#0d0f14`)

### Removed
- Bottom detail panel in Skill Tree (replaced by floating popup)

## [0.8.0] - 2026-03-20

### Added
- **Dark/Light theme toggle** — sun/moon button in the top nav bar
  - Dark mode: black chalkboard (`#0d0f14`) with dashed chalk borders, dust texture, text glow
  - Light mode: cream whiteboard (`#f5f0e8`) with solid marker-style borders, dark text, no glow
  - Theme persisted in VS Code global state (survives restarts)
  - Smooth 0.3s transition when switching
- **"+ Create Skill" button** on Dashboard — triggers the interactive skill scaffold wizard
- All colors now use CSS custom properties (`var(--board)`, `var(--chalk)`, etc.) for theme-awareness
- `create:skill` and `theme:changed` webview message types

### Changed
- Default background changed from green chalkboard to black chalkboard in dark mode
- Tailwind color tokens now reference CSS variables instead of hardcoded hex values
- HTML template passes saved theme via `data-theme` attribute on `<html>` and `<body>`
- Light mode uses solid borders and removes chalk text-shadow/glow effects for a clean whiteboard feel

## [0.7.0] - 2026-03-20

### Changed
- **Chalkboard classroom UI overhaul** — entire visual identity rebuilt to feel like writing on a real chalkboard
  - Dark green board backgrounds (`#1a2f28`) replace pure black surfaces
  - SVG noise texture overlay on body for chalk dust grain
  - All borders now dashed (hand-drawn chalk stroke feel)
  - Headings use monospace `Courier New` font (written-on-board look)
  - Text glow/shadow effects simulate chalk bleed
  - Chalk stick color palette: white, yellow, pink, blue, green, orange
- Cards styled as chalk-drawn rectangles with noise texture overlay
- XP bars drawn with dashed borders (chalk-on-board style)
- Radar chart uses chalk-green grid lines and chalk-white data strokes
- Achievement badges use dashed chalk rings instead of solid borders
- Activity timeline has gradient fade mask at bottom
- Level-up cinematic uses chalk dust burst particles on green board backdrop
- Achievement ceremony uses chalk-yellow accents with dashed badge ring
- Empty states: removed bobbing animation, added optional action button (e.g. "Clear filters")
- Filter pills: bumped text to 11px, active filters show visible ring indicator
- Skill cards: 2-line name wrap, 13px description text, unified "Undiscovered" state across views
- Skill tree detail panel: capped height with scroll, shows all capabilities
- Tab navigation: chalk-glow underline, subtle hover/tap motion feedback
- Achievement ceremony deferred when level-up cinematic is playing (no more overlap)

### Added
- Makefile with full build/dev/release workflow (`make help` to see all commands)
- `scroll-fade` CSS utility for gradient-masked scroll containers
- `chalk-text`, `chalk-heading`, `chalk-border`, `chalk-dust` CSS utility classes
- Achievement badges grouped by category with section headers
- Chalkboard color tokens in Tailwind: `board`, `board-light`, `board-dark`, `chalk-dim`, `chalk-yellow`, `chalk-pink`, `chalk-blue`, `chalk-green`

### Fixed
- Achievement notification hidden behind level-up overlay (now sequenced with `defer` prop)
- Skill tree "locked" label inconsistent with inventory "Undiscovered" (unified to "undiscovered")
- Capabilities in detail panel truncated to 3 (now shows all with scroll)

## [0.6.0] - 2026-03-20

### Changed
- Complete UI redesign to match the new minimalist "Chalk" brand aesthetic
- Replaced neon cyber/gamified styles with sleek, premium chalk-themed colors (slate, chalk white, muted pastels)
- Updated card styles to simulate soft chalk glows instead of harsh dropshadows
- Redesigned the skill tree phase connectors to look like dotted chalk lines
- Replaced intense holographic epic card gradients with an elegant, subtle chalk-dust effect
- Updated all hardcoded phase colors in TypeScript to match the new semantic Tailwind palette
- Added a new official publisher logo and extension icon to the workspace

## [0.5.0] - 2026-03-20

### Changed
- Skill Tree rewritten: collapsible phase sections with grid layout, phase jump bar, progress indicators
- Sidebar clicking now properly navigates to the correct tab (Skill Tree or Inventory)
- License corrected to MIT (matches LICENSE file)
- Version bump for release readiness

### Fixed
- Clicking "Skill Tree" in sidebar when webview was already open now switches to the Skill Tree tab

## [0.4.0] - 2026-03-20

### Added
- README with full feature docs, commands, settings, and skill file format reference
- CHANGELOG
- Extension icon (SVG + PNG)
- Package metadata (keywords, categories, repository, description)

### Fixed
- Sidebar phase nodes now open the Skill Tree webview on click
- Phase labels in sidebar show discovered/total count

### Changed
- Cleaned up unused d3 dependencies and files

## [0.3.0] - 2026-03-20

### Added
- RPG-style skill tree with tiered progression layout (Foundation to Launch)
- TF-IDF classification engine for automatic skill categorization
- Interactive skill nodes with rarity glow effects and hover tooltips
- Skill detail panel with Record/Open actions

### Changed
- Skill tree now uses top-to-bottom tier layout like classic RPG skill trees

## [0.2.0] - 2026-03-20

### Added
- Framer Motion animations throughout the UI
  - Staggered card entrances in Inventory
  - Particle effects on rare/epic skill cards
  - Level-up cinematic overlay
  - Achievement unlock ceremony
  - Scroll-triggered reveals on Dashboard
  - Animated XP bars and counters
  - Tab cross-fade transitions
- Auto-recording of skill usage when agents read SKILL.md files
- Enhanced phase classifier with description keywords, artifact patterns, and capability namespaces
- Auto-indexer with user override support for skill phases
- Modal transitions for skill detail drawer
- Empty state animations
- Reduced motion support (prefers-reduced-motion)
- VSCode settings: `autoRecord.enabled`, `autoRecord.cooldownSeconds`, `animations.level`

## [0.1.0] - 2026-03-20

### Added
- Initial release
- Skill loader parsing SKILL.md files with YAML frontmatter
- Phase classification via skills-index.yaml and regex patterns
- Gamified dashboard with player level, XP, radar chart
- Skill inventory with card grid, filtering, and sorting
- Skill tree sidebar with phase grouping
- XP progression system with risk-based XP rates
- Achievement system (16 achievements across 4 categories)
- Skill rarity system (common/rare/epic) based on risk level
- Geometric card art generation per skill
- Activity timeline and phase coverage stats
