# Implementation Plan - Supabase & Core Operations

Integrate Supabase as the primary data store for the Leirad Hotspot application to manage vouchers and usage statistics, backed by full-stack analytics and an integrated system auditing layer.

## User Requirements
- Store all application data in Supabase.
- Display data fetched from Supabase in real-time or on load.
- Maintain the polished Kiosk UI and full-stack security.
- Comprehensive metrics visualization showing stock values, collection, portfolio value, and conversions.
- Track all logs (manual add, import, delete, update, clear, and redeem events) on the system.
- Filter and paginate the unified action logs with a high-fidelity table layout.

## Architectural Decisions
- **Full-Stack Architecture**: Use Express.js as a backend proxy to interact with Supabase, keeping API keys hidden from the client.
- **Data Persistence**: Use Supabase (PostgreSQL) for storing voucher availability and redemption history.
- **Unified Action Auditing**: Provide local/session log persistence synchronized with database updates. Every destructive or creative operation creates a typed Audit Log payload.
- **Filter and Pagination Design**: Apply client-side, highly-responsive search filters and cursor/index-based pagination logic for real-time log reviews.

## Technology Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide React, Motion.
- **Charts**: Recharts (Area, Bar, Pie, Cell, Tooltip).
- **Backend**: Node.js, Express, tsx.
- **Database**: Supabase (@supabase/supabase-js).

## Data Models

### Table: `vouchers`
- `id`: uuid (PK)
- `code`: text (unique)
- `duration`: text (e.g., '1H', '3H', '1D', '2D', '30D')
- `price`: text
- `status`: text (enum: 'available', 'used')
- `created_at`: timestamp
- `redeemed_at`: timestamp (nullable)

### Table: `hotspot_import_logs`
- `id`: uuid (PK, default: `gen_random_uuid()`)
- `filename`: text (Event Category header)
- `count`: integer (Stock delta count)
- `date`: timestamp with time zone (default: `now()`)
- `action_type`: text (Event action code)
- `details`: text (Descriptive event context)

### System Log Schema Interface
```typescript
interface SystemLog {
  id: string;
  filename: string; // Event Category header
  count: number;    // Stock change delta (+/-)
  date: string;     // ISO Timestamp
  actionType?: 'import' | 'manual_add' | 'delete' | 'status_update' | 'clear' | 'redeem' | string;
  details?: string; // Descriptive contextual text
}
```

## API Design

### GET `/api/logs`
Returns all system logs from `hotspot_import_logs`, ordered by date descending.
**Special Behavior**: Triggers automatic database deletion for logs older than 30 days.
**Response**:
```json
{
  "logs": [
    {
      "id": "uuid-1234",
      "filename": "Vouchers Imported",
      "count": 100,
      "date": "2026-07-19T22:30:00.000Z",
      "actionType": "import",
      "details": "Imported 100 vouchers from upload.csv"
    }
  ],
  "source": "Supabase"
}
```

### POST `/api/logs`
Inserts a new system event log into `hotspot_import_logs`.
**Body**:
```json
{
  "id": "uuid-1234",
  "filename": "Status Updated",
  "count": 0,
  "date": "2026-07-19T22:30:00.000Z",
  "actionType": "status_update",
  "details": "Changed voucher code ABCD status to used"
}
```
**Response**: `{ "success": true, "source": "Supabase" }`

### GET `/api/vouchers/stats`
Returns counts of available and redeemed vouchers.
```json
{
  "available": 150,
  "used": 45
}
```

### POST `/api/vouchers/redeem`
Redeems a voucher for a specific duration.
**Body**: `{ "durationId": "1H" }`
**Response**: `{ "success": true, "code": "ABCD-1234", "duration": "1H" }`

### GET `/api/supabase-config`
Retrieves current server-side environment variables configured for Supabase connections (URL, Anon Key, and Service Role Key) to display for diagnosis in the settings panel.
**Response**:
```json
{
  "url": "https://example.supabase.co",
  "anonKey": "...",
  "serviceRoleKey": "..."
}
```

## Implementation Steps

1. **Environment Setup**:
   - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`.
2. **Dependency Installation**:
   - `npm install @supabase/supabase-js express recharts`
3. **Backend Development**:
   - Create/Update `server.ts` with Express and Supabase initialization.
   - Implement API endpoints for stats, redemption, and credentials diagnostic fetch.
4. **Analytics View**:
   - Implement dynamic metrics (Realized Earnings, Unrealized Value, Total Portfolio Value, Conversion Rate).
   - Render interactive Area charts, Pie breakdown, and Plan Distribution Bar charts.
5. **Unified Logger & Filtering / Pagination**:
   - Upgrade the logs list from a basic import table to a fully filtered and paginated Event Logger supporting categories, keyword searches, and page counts.
6. **Diagnostics Panel**:
   - Create a safe Diagnostic credentials view inside the Settings block featuring standard redacted mask state (`••••••••`) and independent reveal toggle action buttons (`Eye`/`EyeOff`).
7. **UI Polish**:
   - Ensure loading states are handled gracefully during data fetching.
8. **Mobile Scrollable Kiosk Metrics**:
   - Redesigned Kiosk Mode metrics panel for mobile devices (`lg:hidden` dashboard viewport).
   - Created a space-saving horizontally scrollable carousel card deck with touch momentum, interactive pagination dot indicators (`activeCardIndex`), and layout-locking dimensions.
   - Dynamic indicators calculated inside `KioskView` based on active voucher states:
     - **Current Income**: Total Php collected from used codes.
     - **Available Stock**: Count of unsold vouchers and total value.
     - **System Valuation**: Cumulative worth of the entire portfolio.
   - Equipped the carousel deck with tactile left and right scroll navigation buttons (`ChevronLeft` and `ChevronRight`) bounding the pagination indicators, allowing seamless navigation by click/tap in addition to gesture swipes.
9. **Contrast & Readability Audit**:
   - Elevated metrics deck subtext sizes from `text-[10px]` to `text-xs` to satisfy mobile legibility thresholds.
   - Designed high-contrast background badging matching semantic statuses (emerald, blue, and indigo).
   - Styled text to react to theme shifts with exact dark-and-light high-contrast color codes (`text-slate-900` vs. `text-white` for numeric data, `text-slate-500` vs. `text-slate-400` for descriptions).
10. **Dashboard Recent Vouchers Filtering Fix**:
    - Identified a bug where "Recent Vouchers" on the dashboard tab only passed a sliced subset (`vouchers.slice(0, 5)`) down to `VoucherTable`, preventing search inputs, duration selections, and "Used / Redeemed" status filtering from matching items beyond the initial 5 rows (leading to incorrect empty result messages).
    - Introduced a dynamic `defaultItemsPerPage` configuration prop (defaults to 10) in `VoucherTable` to allow custom initial page limits without truncating the input dataset.
    - Updated `App.tsx` to pass the entire `vouchers` array to `VoucherTable` on the dashboard, coupled with `defaultItemsPerPage={5}` to maintain a clean layout while enabling full search and filtering capabilities across the entire database collection.
11. **Local Storage Kiosk History (My Purchased Codes)**:
    - Added a local storage persistence layer inside the Kiosk mobile view to automatically save a historical record of all generated/redeemed codes for that specific device.
    - Designed a "My Purchased Codes" interactive modal, displaying locally-stored codes in a clean, scrollable list with duration badges and full date/time generated timestamps. Enhanced typography and spacing to ensure maximum readability and professional presentation.
12. **Dashboard & Kiosk Income Metrics**:
    - Replaced existing voucher count cards on the dashboard and Kiosk mobile view with financial metrics: Today's Income, Last Week's Income, and Monthly Income.
    - Added the "Available Vouchers" card to the dashboard, rendering a 4-column desktop grid for full-width displays.
    - Renamed "Available Stock" to "Available Vouchers" in the Kiosk view to match the dashboard naming conventions.
    - Updated the `Voucher` type and `useVouchers` hook to properly map the backend `redeemed_at` field to `usedAt` on the client.
    - Implemented `useMemo` calculation blocks in `App.tsx` and `KioskView.tsx` that iterate over used vouchers and compute accurate revenue totals based on redemption timestamps and parsed prices.
    - Upgraded `StatsCard` to support string-formatted currency values, an amber color variant, and inline Lucide icons for a more polished financial dashboard layout.
    - Replaced the "System Valuation" card inside the Kiosk View with the trio of income tracking cards, while retaining the "Available Vouchers" card.
13. **Global Dark Mode Theme Support**:
    - Enabled standard Tailwind CSS class-based dark mode (`dark:`) across all desktop views (Dashboard, Analytics, Logs, Settings).
    - Linked the `isDarkMode` state in `App.tsx` to automatically inject the `dark` class into the root `document.documentElement`.
    - Recursively updated all background (`bg-slate-50`, `bg-white`), typography (`text-slate-900`, `text-slate-500`), and structural border utility classes to dynamically adapt between light and dark themes using explicit `dark:` overrides on all primary desktop components.



