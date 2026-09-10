# Migration Plan: Convert Frontend from Next.js to Vite + React (SPA)

This plan details the migration of the `frontend` application from **Next.js 14** (App Router) to a clean **Vite + React** Single Page Application (SPA) using **React Router v6**.

## User Review Required

> [!IMPORTANT]
> - **Framework Change:** Switching to Vite + React replaces Next.js Server-Side Rendering (SSR) / App Router with pure client-side React SPA rendering.
> - **Routing Change:** Navigation will be powered by `react-router-dom` (`Link`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams`) instead of `next/navigation` and `next/link`.
> - **Build Output:** The build directory will change from `.next/` to `dist/`, completely eliminating the `.next` folder.

## Open Questions

- None. The UI components, styling (Tailwind + Ant Design), and API services will remain identical, only the framework wrapper and routing will change.

## Proposed Changes

### Configuration & Package Dependencies

#### [MODIFY] [package.json](file:///d:/SMDT/frontend/package.json)
- Remove `next` and `@ant-design/nextjs-registry` dependencies.
- Add `vite` and `react-router-dom` dependencies.
- Update `scripts` to:
  - `"dev": "vite"`
  - `"build": "vite build"`
  - `"preview": "vite preview"`
  - `"test": "vitest run"`

#### [NEW] [vite.config.js](file:///d:/SMDT/frontend/vite.config.js)
- Configure Vite with `@vitejs/plugin-react` and set path alias `@` to `./src`.

#### [DELETE] [next.config.mjs](file:///d:/SMDT/frontend/next.config.mjs)
- Remove Next.js config file.

#### [MODIFY] [.gitignore](file:///d:/SMDT/.gitignore)
- Replace `.next/` with `dist/` and `node_modules/`.

---

### Core Entry & Routing Setup

#### [NEW] [index.html](file:///d:/SMDT/frontend/index.html)
- Root HTML file for Vite SPA with `<div id="root"></div>` and entry script tag `/src/main.jsx`.

#### [NEW] [src/main.jsx](file:///d:/SMDT/frontend/src/main.jsx)
- Mount React root element, wrapping the app with `ThemeProvider` and `AuthProvider`.

#### [NEW] [src/App.jsx](file:///d:/SMDT/frontend/src/App.jsx)
- Set up `<BrowserRouter>` with `<Routes>` for all application pages:
  - `/` -> Redirect to `/dashboard`
  - `/login` -> Login page
  - `/register` -> Register page
  - `/dashboard` -> Dashboard page
  - `/meetings` -> Meetings list page
  - `/meetings/new` -> Create meeting page
  - `/meetings/:id` -> Meeting detail page
  - `/my-actions` -> Action items page
  - `/admin` -> Admin page
  - `/oauth-callback` -> OAuth Callback page

---

### Components & Context Updates (Replacing Next.js Hooks with React Router)

#### [MODIFY] [src/context/AuthContext.jsx](file:///d:/SMDT/frontend/src/context/AuthContext.jsx)
- Replace `useRouter` and `usePathname` from `next/navigation` with `useNavigate` and `useLocation` from `react-router-dom`.

#### [MODIFY] [src/components/MainLayout.jsx](file:///d:/SMDT/frontend/src/components/MainLayout.jsx)
- Replace `usePathname` from `next/navigation` with `useLocation` from `react-router-dom`.

#### [MODIFY] [src/components/Navbar.jsx](file:///d:/SMDT/frontend/src/components/Navbar.jsx)
- Replace Next.js `Link`, `usePathname`, `useRouter` with `react-router-dom` `Link`, `useLocation`, `useNavigate`.

#### [MODIFY] Pages in `src/app/` (or refactored to `src/pages/`)
- Update `Link` (`href` -> `to`), `useRouter` -> `useNavigate`, `useParams`, `useSearchParams` across:
  - `src/app/dashboard/page.jsx`
  - `src/app/login/page.jsx`
  - `src/app/register/page.jsx`
  - `src/app/meetings/page.jsx`
  - `src/app/meetings/new/page.jsx`
  - `src/app/meetings/[id]/page.jsx`
  - `src/app/my-actions/page.jsx`
  - `src/app/oauth-callback/page.jsx`
  - `src/app/layout.jsx` (remove `@ant-design/nextjs-registry` and Next.js font imports)

---

## Verification Plan

### Automated Tests
- Run `npm test` inside `frontend/` to verify Vitest tests continue to pass.
- Run `npm run build` inside `frontend/` to ensure Vite successfully bundles the SPA into `dist/`.

### Manual Verification
- Run `npm run dev` in `frontend/` to launch Vite dev server.
- Verify navigation across all routes (`/login`, `/dashboard`, `/meetings`, `/my-actions`, `/admin`).
- Verify authentication redirect flow.
- Confirm `.next` folder is no longer created or used.
