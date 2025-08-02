# Snagio - Claude Code Context

## Quick Start

```bash
# After cloning/creating the project
npm install
npm run dev           # Start development server on http://localhost:3000
npm run lint          # Check code quality
npm run typecheck     # Verify TypeScript types
```

## Critical Information

### Project Goal

Build a photo-centric inspection tracking system with customizable labels for multiple industries (construction, property inspection, quality control). Photos are the PRIMARY focus (70mm width in PDFs).

### Key Constraints

1. **A4 PDF Layout**: MUST maintain 70mm photo width (38.9% of table)
2. **Offline-First**: Must work without internet on construction sites
3. **Customizable Headers**: All column labels must be configurable per project
4. **Photo Quality**: Never compress below 80% quality, maintain aspect ratios
5. **Performance**: Must handle 10,000+ items per project smoothly

### Non-Negotiable Architecture Decisions

- Next.js App Router (NOT Pages Router)
- Server Components by default (client only when necessary)
- Supabase for all backend services (no custom backend)
- Prisma as ORM (no raw SQL except for RLS policies)
- Tailwind CSS only (no CSS modules or styled-components)

## Essential Commands

### 🚀 Development

```bash
npm run dev                    # Start dev server
npm run build                  # Production build
npm run start                  # Start production server
```

### ✅ Code Quality (RUN BEFORE COMMITTING)

```bash
npm run lint                   # ESLint check
npm run lint:fix              # Auto-fix issues
npm run typecheck             # TypeScript validation
npm run format                # Prettier formatting
npm run check:all             # Run all checks
```

### 🗄️ Database

```bash
npm run db:generate           # Generate Prisma Client
npm run db:push              # Push schema changes (dev)
npm run db:migrate           # Create migration (production)
npm run db:studio            # Visual database editor
npm run db:seed              # Seed sample data
npm run db:reset             # Reset database (CAUTION)
```

### 🧪 Testing

```bash
npm test                     # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run e2e                 # End-to-end tests
```

## Project Structure

```
snagio/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx     # Auth-specific layout
│   ├── (dashboard)/       # Protected routes
│   │   ├── projects/      # Project management
│   │   │   ├── [projectId]/
│   │   │   │   ├── categories/
│   │   │   │   │   └── [categoryId]/
│   │   │   │   │       └── snags/
│   │   │   │   │           └── [snagId]/
│   │   │   │   └── settings/
│   │   │   └── new/
│   │   └── layout.tsx     # Dashboard layout with nav
│   ├── api/               # API routes
│   │   ├── projects/
│   │   ├── snags/
│   │   ├── upload/
│   │   └── export/
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Shadcn components (DON'T MODIFY)
│   ├── projects/          # Project-related components
│   ├── categories/        # Category components
│   ├── snags/            # Snag/item components
│   │   ├── SnagTable.tsx # CRITICAL: Photo-centric table
│   │   ├── PhotoUploader.tsx
│   │   └── PhotoAnnotator.tsx
│   ├── export/           # PDF generation
│   └── shared/           # Reusable components
├── lib/                  # Utilities & configs
│   ├── supabase/
│   │   ├── client.ts    # Client-side Supabase
│   │   ├── server.ts    # Server-side Supabase
│   │   └── middleware.ts
│   ├── prisma.ts        # Prisma client singleton
│   ├── utils/           # Helper functions
│   └── constants.ts     # App-wide constants
├── hooks/               # Custom React hooks
│   ├── use-auth.ts
│   ├── use-realtime.ts
│   └── use-offline.ts
├── stores/              # Zustand state stores
├── types/               # TypeScript definitions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts         # Seed data
└── public/             # Static assets
```

## Code Patterns & Anti-Patterns

### ✅ DO THIS

```typescript
// Server component (default)
export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  return <ProjectView project={project} />;
}

// Client component (only when needed)
'use client';
export function InteractiveForm() {
  // Uses hooks, state, or browser APIs
}

// API route with proper error handling
export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Validate with Zod
    const validated = schema.parse(data);
    // Process...
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
```

### ❌ AVOID THIS

```typescript
// Don't use 'use client' unnecessarily
'use client' // ❌ Not needed for static content

// Don't use any type
const data: any = await fetch() // ❌ Define proper types

// Don't ignore errors
try {
  await riskyOperation()
} catch {} // ❌ Always handle errors

// Don't use direct database queries in components
const users = await prisma.user.findMany() // ❌ Use API routes or server actions
```

## Database Schema Key Points

```prisma
// Every model has these fields
model AnyModel {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("table_name") // Always use snake_case
}

// Relationships use explicit foreign keys
model Snag {
  categoryId String @map("category_id")
  category   Category @relation(fields: [categoryId], references: [id])
}

// Enums for status fields
enum SnagStatus {
  OPEN
  IN_PROGRESS
  PENDING_REVIEW
  CLOSED
}
```

## Supabase Patterns

### Authentication

```typescript
// Always check auth in server components
import { createServerClient } from '@/lib/supabase/server'

const supabase = createServerClient()
const {
  data: { user },
} = await supabase.auth.getUser()
if (!user) redirect('/login')
```

### File Upload

```typescript
// Use Supabase Storage for images
const { data, error } = await supabase.storage
  .from('snag-photos')
  .upload(`${snagId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false,
  })
```

### Realtime Subscriptions

```typescript
// Subscribe to changes (client-side only)
useEffect(() => {
  const channel = supabase
    .channel('snags')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'snags',
        filter: `category_id=eq.${categoryId}`,
      },
      handleChange
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [categoryId])
```

## Performance Checklist

- [ ] Images lazy loaded with next/image
- [ ] Lists virtualized if >100 items
- [ ] API routes use proper caching headers
- [ ] Database queries use proper indexes
- [ ] Static pages use generateStaticParams
- [ ] Client JS bundle <100KB per route

## Security Checklist

- [ ] All Supabase tables have RLS enabled
- [ ] File uploads validated (type, size)
- [ ] User inputs sanitized
- [ ] API routes check authentication
- [ ] Sensitive operations use server actions
- [ ] Environment variables never exposed

## Common Tasks

### Add New Feature

1. Update Prisma schema if needed
2. Run `npm run db:generate`
3. Create API route with validation
4. Build UI components (server-first)
5. Add client interactivity if needed
6. Write tests
7. Run `npm run check:all`

### Debug Production Issues

```bash
# Check logs
npm run logs:prod

# Verify environment
npm run env:check

# Test production build locally
npm run build && npm run start
```

## Troubleshooting

### "Module not found" errors

```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Prisma errors

```bash
npm run db:generate
npm run db:push # Development only
```

### TypeScript errors

```bash
npm run typecheck -- --listFilesOnly # Find problematic files
```

### Supabase connection issues

- Check `.env.local` has correct URLs
- Verify Supabase project is running
- Check RLS policies aren't blocking

## Testing Approach

### What to Test

1. **Critical paths**: Project creation, snag creation, PDF export
2. **Data validation**: Form submissions, API endpoints
3. **Edge cases**: Offline mode, large datasets, concurrent edits
4. **Accessibility**: Keyboard navigation, screen readers

### Test File Locations

```
__tests__/
├── unit/          # Utility functions
├── integration/   # API routes
├── components/    # React components
└── e2e/          # User flows
```

## Deployment Notes

### Pre-deployment

1. Run `npm run check:all`
2. Test production build locally
3. Verify all env vars are set
4. Run database migrations
5. Enable Supabase RLS policies

### Environment Variables

```env
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
DIRECT_URL=

# Production (set in hosting platform)
# Same variables but with production values
```

## Important Implementation Notes

### PDF Generation

- MUST maintain 70mm photo width (65mm actual + 5mm padding)
- A4 portrait: 210mm x 297mm
- 4-5 items per page maximum
- Photos are PRIMARY content (not supplementary)

### Offline Capability

- Use service workers for caching
- IndexedDB for offline data
- Queue sync operations
- Handle conflicts gracefully

### Mobile Considerations

- Touch targets minimum 44x44px
- Bottom navigation for mobile
- Camera integration essential
- Optimize for slow connections

## Resources & References

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Guides](https://supabase.com/docs/guides)
- [Prisma Best Practices](https://www.prisma.io/docs/guides)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)

## Questions to Ask Before Major Changes

1. Will this work offline?
2. Does it maintain photo quality/size?
3. Is it accessible on mobile devices?
4. Can it handle 10k+ records?
5. Does it follow the established patterns?

---

Remember: Photos are the STAR of this application. Everything else supports showcasing the visual documentation.
