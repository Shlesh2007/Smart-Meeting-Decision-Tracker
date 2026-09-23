# Implementation Plan - Curved Mobile Navigation Bar Redesign

Redesign the mobile/responsive navigation bar (`lg:hidden`) in `Navbar.jsx` to match the user's Figma design reference: a dark curved bar featuring a smooth concave cutout notch and a floating, sliding orange circular button for the active tab.

## User Review Required

> [!IMPORTANT]
> **Key Design Highlights & Behavior**:
> 1. **Visual Style**: Dark background bar (`#18181b`) with rounded pill corners, matching the reference design.
> 2. **Dynamic Cutout Notch**: An SVG path that dynamically renders a smooth concave curve (dip/notch) at the active tab's position.
> 3. **Floating Active Button**: A vivid orange (`#f97316` / `#ff7438`) circular icon badge that sits inside the concave cutout and smoothly slides horizontally when switching tabs.
> 4. **Mobile Navigation Tabs**:
>    - 🏠 **Home / Dashboard** (`/dashboard`)
>    - 📊 **Meetings** (`/meetings`)
>    - ⏰ **Action Items** (`/my-actions`)
>    - 🔔 **Notifications / Profile** (Notification Popover / Profile Modal)

## Proposed Changes

### Frontend Components

#### [MODIFY] [Navbar.jsx](file:///d:/SMDT/frontend/src/components/Navbar.jsx)

- Replace the current standard mobile bottom navigation layout with the custom curved SVG notch bottom bar for mobile screens (`lg:hidden`).
- Calculate the `activeIndex` based on `location.pathname` and modal state.
- Render an SVG background path with a dynamically positioned concave cutout notch at `X = (activeIndex + 0.5) / totalItems * 400`.
- Add an animated floating orange circle button (`bg-orange-500` / `#f97316`) that slides smoothly to the active tab's column using CSS transform transitions.
- Maintain full functionality for all routes (Dashboard, Meetings, Actions, Notifications popover, and Profile modal).

## Verification Plan

### Manual Verification
1. **Responsive Viewport Testing**:
   - Inspect mobile bottom bar on 360px, 390px, 414px, and tablet screen widths using browser dev tools.
2. **Interactive Tab Switching**:
   - Click each item (Home, Meetings, Actions, Notifications/Profile).
   - Verify the cutout notch and active orange circle slide smoothly to the newly selected tab.
   - Verify navigation to respective routes or modal triggers.
3. **Desktop Integrity**:
   - Ensure desktop sidebar (`lg:flex`) and top header bar continue operating without any disruption.
