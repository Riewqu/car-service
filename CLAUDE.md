# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Car Service Manager (KG Feeling Service) - A Progressive Web App (PWA) for managing automotive service center operations. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL). Supports Thai language UI with both dark and light themes.

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server with webpack (http://localhost:3000)

# Build & Deploy
npm run build           # Build for production
npm start              # Start production server

# Code Quality
npm run lint           # Run Next.js linter

# Database Types
npm run gen:types      # Generate TypeScript types from Supabase schema
                       # Output: lib/database.types.ts
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19
- **Styling**: Tailwind CSS with dark/light theme support (class-based dark mode)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **State Management**: React Context (ThemeContext for theme switching)
- **Icons**: Lucide React
- **PWA**: next-pwa with service worker and runtime caching

### Path Aliases
- `@/*` maps to project root (configured in tsconfig.json)

### Core Structure

```
app/                          # Next.js App Router pages
├── layout.tsx               # Root layout with ThemeProvider & Navigation
├── page.tsx                 # Home page
├── products-new/            # Product management
├── stock/                   # Stock management
├── services/                # Service history & records
│   └── new/                 # Create new service record
├── dashboard/               # Dashboard with analytics
└── settings/                # App settings

components/
├── Navigation.tsx           # Responsive nav (desktop header + mobile bottom bar)
├── SelectModal.tsx          # Reusable selection modal
├── MultiSelectModal.tsx     # Multi-selection modal
├── CameraCapture.tsx        # Camera integration for service images
├── PinProtection.tsx        # PIN lock wrapper component
├── PinLock.tsx             # PIN entry screen
├── PinSettings.tsx         # PIN configuration UI
├── AuditTrail.tsx          # Service record history viewer
└── EditServiceModal.tsx    # Edit service records

contexts/
└── ThemeContext.tsx         # Theme state management (dark/light mode)

lib/
├── supabase.ts             # Supabase client initialization
└── database.types.ts       # Auto-generated from Supabase schema
```

### Database Schema

The application uses 9 main tables in Supabase:

1. **products** - Products/parts catalog with image support
2. **product_prices** - Historical pricing (tracks price changes over time)
3. **stock** - Current inventory levels
4. **stock_movements** - Audit trail for all stock changes (IN/OUT/ADJUSTMENT/SERVICE_USE)
5. **service_types** - Service categories (oil change, tire change, etc.)
6. **service_records** - Main service transaction records with soft delete support
7. **service_record_services** - Many-to-many: services performed per record
8. **service_record_products** - Many-to-many: parts used per record
9. **service_record_history** - Audit trail for service record changes
10. **service_images** - Images attached to service records with timestamps

**Key Database Features:**
- Auto-decreasing stock trigger when products are used in service records
  - Includes negative stock validation (raises exception if stock would go negative)
  - Logs all stock movements to stock_movements table with reference_id
- Auto-logging of stock movements for all stock changes (manual adjustments + service usage)
- Soft delete for service_records (deleted_at, deleted_by fields)
- Audit trail for service_records (service_record_history table with old_data/new_data JSONB)
- Auto-updating timestamps via triggers
- RLS (Row Level Security) enabled with public access policies
- Image storage in two Supabase Storage buckets:
  - `products` (for product images)
  - `service-images` (for service record images)

### Theme System

The app uses a custom ThemeContext that:
- Stores theme preference in localStorage
- Applies dark/light mode via Tailwind's `dark:` classes
- Toggles between themes with Sun/Moon icons in Navigation
- Uses system preference as default on first load
- Prevents hydration mismatches with inline script in layout.tsx

**Design tokens:**
- Dark mode: black backgrounds (#000000) with zinc tones
- Light mode: white backgrounds with gray tones
- High contrast for accessibility

### PWA Configuration

Configured in `next.config.js`:
- Service worker auto-generated to `public/` directory
- Disabled in development mode for faster iteration
- Manifest at `public/manifest.json` with Thai language support
- Runtime caching strategy for Supabase images (CacheFirst, 30 days, max 100 entries)
- Supports installation on mobile and desktop
- Theme color: #000000 (black) for consistent dark mode appearance

**Next.js Optimizations:**
- Image optimization: AVIF and WebP formats
- Custom device sizes for responsive images: [640, 750, 828, 1080, 1200]
- Custom image sizes: [16, 32, 48, 64, 96, 128, 256, 384]
- SWC minification enabled
- Console logs removed in production builds
- Turbopack support enabled
- React strict mode enabled

### Security Features

**PIN Protection System:**
- Optional PIN lock for app access
- Configured via Settings page (PinSettings component)
- PIN stored in localStorage (hashed)
- Session-based unlocking (sessionStorage tracks unlock state)
- PinProtection wrapper in layout.tsx protects entire app
- Prevents hydration mismatches with client-side only rendering

### Image Handling

Supabase Storage is configured for images:
- Two buckets: `products` and `service-images` (both must be public)
- Remote patterns in next.config.js: `*.supabase.co` (allows Next.js Image optimization)
- Product images uploaded via product management UI
- Service images uploaded via camera capture or file selection in service record creation

## Important Development Notes

### Supabase Setup

1. **Environment Variables Required** (`.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Initial Database Setup**:
   - Run the main schema SQL in Supabase SQL Editor (creates all core tables)
   - Apply migrations in `supabase/migrations/` directory:
     - `create_stock_trigger.sql` - Stock trigger with negative stock validation
     - `create_service_images.sql` - Service images table and storage bucket
     - `create_stock_movements.sql` - Stock movement audit trail
   - Apply migrations in `migrations/` directory:
     - `002_audit_logging_soft_delete.sql` - Audit trail and soft delete for service records

3. **Type Generation**: After schema changes, run `npm run gen:types` to update TypeScript types
   - Requires Supabase project ID to be in the command (currently: rtmfkzdxyfksaiqcevkm)
   - This queries your live Supabase schema and generates types

4. **Storage Buckets**: Create two public buckets in Supabase Storage:
   - `products` for product images
   - `service-images` for service record images

### Stock Management Flow

Stock is automatically decremented when:
- A service record is created with products
- The `trigger_decrease_stock` database trigger fires on insert to `service_record_products`
  - Trigger includes validation: raises exception if stock would become negative
  - This prevents overselling and ensures stock integrity
  - Automatically logs movement to `stock_movements` table with movement_type='SERVICE_USE'
- Manual stock adjustments are made via the stock management page
  - Also logged to `stock_movements` table with movement_type='IN' or 'OUT'

### Service Record Management

**Creating Service Records** (`app/services/new/page.tsx`):
1. User enters license plate and date
2. Selects service types (can select multiple)
3. Selects products/parts with quantities
4. Can attach images via camera or upload
5. On submit: creates service_record, links services and products, stock auto-decrements

**Editing Service Records**:
- Service records support editing after creation
- Changes are logged to `service_record_history` table with old_data/new_data snapshots
- EditServiceModal component handles the edit UI
- Audit trail can be viewed via AuditTrail component

**Soft Delete**:
- Service records can be soft deleted (deleted_at field set)
- Deleted records are hidden from normal views but retained in database
- Can be restored via audit trail

### Image Upload Pattern

Products and services support image uploads:
- Products: `supabase.storage.from('products').upload()` → `products` bucket
- Service images: `supabase.storage.from('service-images').upload()` → `service-images` bucket
- Image previews use `URL.createObjectURL()` for client-side display before upload
- File inputs accept common image formats (JPEG, PNG, WebP)
- CameraCapture component enables direct camera access for capturing service images
- Service images include timestamp metadata (image_date) stored in `service_images` table
