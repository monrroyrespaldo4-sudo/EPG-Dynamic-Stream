# Design Guidelines: EPG IPTV Admin Panel

## Design Approach

**Selected System**: Material Design with dashboard patterns inspired by Linear and Notion for clean data management

**Rationale**: This is a utility-focused admin panel requiring efficient data entry, clear information hierarchy, and robust form handling. Material Design provides excellent patterns for data-dense interfaces while maintaining visual clarity.

---

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 
  - H1: 2xl (24px), semibold - page titles
  - H2: xl (20px), semibold - section headers
  - H3: lg (18px), medium - card titles
- **Body**: base (16px), regular
- **Labels**: sm (14px), medium
- **Helper text**: xs (12px), regular

### Layout System
**Spacing Units**: Tailwind's 4, 6, 8, 12, and 16
- Component padding: p-6 or p-8
- Section gaps: space-y-8
- Card spacing: p-6
- Form field gaps: space-y-4
- Tight spacing: gap-4

**Grid Structure**:
- Sidebar: 64px collapsed / 256px expanded
- Main content: max-w-7xl with px-6 py-8
- Two-column forms: grid-cols-2 gap-6
- Channel cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Component Library

### Navigation
**Sidebar (Left)**:
- Dashboard icon + label (Home)
- Channels Management
- EPG Generator
- XML Export
- Settings
- Collapsible with icon-only state
- Active state with accent border-l-4

### Dashboard Cards
**Stats Overview** (Top):
- Total Channels count
- Active Programs count
- Last XML Generation timestamp
- XML URL with copy button
- 4-column grid (grid-cols-4 gap-6)

### Channel Management Table
**Columns**: 
- Channel Logo (thumbnail 48px)
- Channel Name
- Channel ID
- Category badge
- Status toggle
- Actions (Edit/Delete icons)

**Features**:
- Search bar with filter
- Add Channel button (primary, top-right)
- Sortable headers
- Hover state on rows
- Empty state illustration when no channels

### Forms
**Add/Edit Channel Modal**:
- Full-screen overlay with centered card (max-w-2xl)
- Fields: Name, ID, Logo URL, Category dropdown
- Program section with repeating input
- Preview panel (split layout showing live preview)
- Save/Cancel buttons (right-aligned)

**Program Configuration**:
- Title input
- Duration selector (default 1 hour)
- Description textarea
- Start time picker
- "Generate 24h Schedule" button

### EPG Generator Section
**Configuration Panel**:
- Date range picker
- Select channels (multi-select with checkboxes)
- "Generate EPG XML" primary button
- Progress indicator during generation
- Success state with download/copy URL

### XML Export View
**Display**:
- Static URL in read-only input with copy icon
- QR code for mobile access
- Last generated timestamp
- "Regenerate" button
- Sample XML preview (code block with syntax highlighting)

---

## Interaction Patterns

### Actions
- **Primary actions**: Filled buttons with subtle shadow
- **Secondary actions**: Outlined buttons
- **Danger actions**: Red outlined on hover
- **Icon buttons**: Circular with hover background (40px touch target)

### Feedback
- Toast notifications (top-right, 4s duration)
- Loading states: Skeleton screens for tables, spinners for buttons
- Success: Green check icon with message
- Errors: Red alert banner with retry option

### Empty States
- Centered illustration + heading + description + CTA button
- "No channels yet" → "Add your first channel"
- "No programs configured" → "Set up program schedule"

---

## Visual Hierarchy

### Density
- **Compact mode option** for tables (reduce padding to p-4)
- Standard spacing for forms and cards
- Generous whitespace in empty states

### Elevation
- Cards: subtle border with no shadow (border-gray-200)
- Modals: shadow-2xl with backdrop blur
- Dropdowns: shadow-lg
- No elevation on flat tables

### Borders
- Rounded corners: rounded-lg (8px) for cards
- rounded-md (6px) for inputs
- rounded-full for badges and avatars

---

## Responsive Behavior

**Desktop (lg+)**: Full sidebar, multi-column grids
**Tablet (md)**: Collapsed sidebar, 2-column layouts
**Mobile**: Bottom nav, single-column, full-width modals

---

## Special Components

**XML Preview Code Block**:
- Monospace font (Fira Code or JetBrains Mono)
- Line numbers
- Copy button overlay
- Scrollable with max-height

**Status Indicators**:
- Online/Active: Green dot
- Processing: Animated pulse yellow
- Error: Red dot with tooltip

**Category Badges**:
- Pill shape (rounded-full)
- Subtle background tints
- Small text (text-xs)