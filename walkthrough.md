# Walkthrough - Notification Bell Red Dot Alignment Fix

Fixed the notification bell icon unread indicator dot alignment in [Navbar.jsx](file:///d:/SMDT/frontend/src/components/Navbar.jsx).

## Root Cause & Fix

### Root Cause
Previously, a custom absolute red dot span (`absolute top-1 right-1`) was rendered inside a reduced-size container (`w-7.5 h-7.5`), causing the red dot to sit directly in the center over the bell icon symbol itself, obscuring the bell icon.

### Changes Made in [Navbar.jsx](file:///d:/SMDT/frontend/src/components/Navbar.jsx)
- Wrapped the `<BellOutlined className="text-base" />` icon inside Ant Design's `<Badge dot={hasUnread} offset={[-1, 1]}>`.
- Ant Design automatically positions the unread red dot at the top-right corner of the bell icon, leaving the entire bell icon symbol 100% visible and un-obscured.

## Verification Checklist

- [x] Bell icon is clearly visible.
- [x] Unread notification red dot sits cleanly at the top-right corner of the bell icon.
- [x] Clicking notification popover toggles notifications as expected.
