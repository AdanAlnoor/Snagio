# Snagio - Complete Implementation Guide for Claude Code

## Project Overview

Create a full-stack application called "Snagio" - a flexible inspection and issue tracking system that can be used for construction snagging, quality control, property inspections, or any visual documentation workflow. The system allows users to customize column headers to adapt to different use cases.

### Core Use Cases

1. **Construction Snagging**: Track defects in construction projects
2. **Property Inspections**: Document issues during property surveys
3. **Quality Control**: Manufacturing or product quality checks
4. **Maintenance Logs**: Track repairs and maintenance issues
5. **Safety Inspections**: Document safety hazards with photos

## Key Features

1. **Hierarchical Structure**: Project → Category → Item (Snag)
2. **Photo-Centric Design**: Large photos as the primary focus
3. **Customizable Headers**: Users can rename columns for their use case
4. **Offline Capability**: Work without internet connection
5. **PDF Export**: Professional A4 portrait reports
6. **Real-time Collaboration**: Live updates across devices

## Technical Stack

- **Frontend**: Next.js 14+ with TypeScript (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **PDF Generation**: jsPDF + html2canvas

## Database Schema with Customizable Fields

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  firstName       String    @map("first_name")
  lastName        String    @map("last_name")
  role            Role      @default(INSPECTOR)
  company         String?
  phone           String?
  avatarUrl       String?   @map("avatar_url")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  createdProjects Project[]
  assignedSnags   Snag[]    @relation("SnagAssignee")
  createdSnags    Snag[]    @relation("SnagCreator")
  comments        Comment[]
  uploadedPhotos  SnagPhoto[]
  statusChanges   StatusHistory[]

  @@map("users")
}

model Project {
  id               String    @id @default(uuid())
  code             String    @unique
  name             String
  description      String?
  address          String
  clientName       String    @map("client_name")
  contractorName   String    @map("contractor_name")
  startDate        DateTime  @map("start_date")
  expectedEndDate  DateTime  @map("expected_end_date")
  status           ProjectStatus @default(PLANNING)
  createdById      String    @map("created_by_id")
  createdBy        User      @relation(fields: [createdById], references: [id])
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Customizable settings
  settings         ProjectSettings?
  categories       Category[]

  @@index([status])
  @@index([createdById])
  @@map("projects")
}

model ProjectSettings {
  id              String    @id @default(uuid())
  projectId       String    @unique @map("project_id")
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Customizable column headers
  itemLabel       String    @default("Snag") @map("item_label") // e.g., "Snag", "Issue", "Defect"
  numberLabel     String    @default("No.") @map("number_label")
  locationLabel   String    @default("Location") @map("location_label")
  photoLabel      String    @default("Photo") @map("photo_label")
  descriptionLabel String   @default("Description") @map("description_label")
  solutionLabel   String    @default("Solution") @map("solution_label")
  statusLabel     String    @default("STATUS") @map("status_label")

  // Custom status options
  customStatuses  Json?     @map("custom_statuses") // Array of {value, label, color}

  // Display preferences
  photoSize       PhotoSize @default(LARGE) @map("photo_size")
  rowsPerPage     Int       @default(5) @map("rows_per_page")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("project_settings")
}

model Category {
  id               String    @id @default(uuid())
  projectId        String    @map("project_id")
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name             String
  code             String
  description      String?
  orderIndex       Int       @default(0) @map("order_index")
  parentCategoryId String?   @map("parent_category_id")
  parentCategory   Category? @relation("CategoryTree", fields: [parentCategoryId], references: [id])
  subCategories    Category[] @relation("CategoryTree")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  snags            Snag[]

  @@unique([projectId, code])
  @@index([projectId])
  @@map("categories")
}

model Snag {
  id              String    @id @default(uuid())
  number          Int
  categoryId      String    @map("category_id")
  category        Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  location        String
  description     String
  solution        String?
  status          SnagStatus @default(OPEN)
  priority        Priority   @default(MEDIUM)
  assignedToId    String?    @map("assigned_to_id")
  assignedTo      User?      @relation("SnagAssignee", fields: [assignedToId], references: [id])
  createdById     String     @map("created_by_id")
  createdBy       User       @relation("SnagCreator", fields: [createdById], references: [id])
  dueDate         DateTime?  @map("due_date")
  completedDate   DateTime?  @map("completed_date")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  photos          SnagPhoto[]
  comments        Comment[]
  statusHistory   StatusHistory[]

  @@unique([categoryId, number])
  @@index([status])
  @@index([priority])
  @@index([assignedToId])
  @@map("snags")
}

model SnagPhoto {
  id              String    @id @default(uuid())
  snagId          String    @map("snag_id")
  snag            Snag      @relation(fields: [snagId], references: [id], onDelete: Cascade)
  url             String
  thumbnailUrl    String    @map("thumbnail_url")
  caption         String?
  hasMarkup       Boolean   @default(false) @map("has_markup")
  markupData      Json?     @map("markup_data") // Stores annotation data
  uploadedById    String    @map("uploaded_by_id")
  uploadedBy      User      @relation(fields: [uploadedById], references: [id])
  uploadedAt      DateTime  @default(now()) @map("uploaded_at")

  @@index([snagId])
  @@map("snag_photos")
}

model Comment {
  id              String    @id @default(uuid())
  snagId          String    @map("snag_id")
  snag            Snag      @relation(fields: [snagId], references: [id], onDelete: Cascade)
  userId          String    @map("user_id")
  user            User      @relation(fields: [userId], references: [id])
  content         String
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([snagId])
  @@map("comments")
}

model StatusHistory {
  id              String    @id @default(uuid())
  snagId          String    @map("snag_id")
  snag            Snag      @relation(fields: [snagId], references: [id], onDelete: Cascade)
  fromStatus      SnagStatus @map("from_status")
  toStatus        SnagStatus @map("to_status")
  changedById     String    @map("changed_by_id")
  changedBy       User      @relation(fields: [changedById], references: [id])
  reason          String?
  changedAt       DateTime  @default(now()) @map("changed_at")

  @@index([snagId])
  @@map("status_history")
}

enum Role {
  ADMIN
  PROJECT_MANAGER
  INSPECTOR
  CONTRACTOR
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
}

enum SnagStatus {
  OPEN
  IN_PROGRESS
  PENDING_REVIEW
  CLOSED
  ON_HOLD
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum PhotoSize {
  SMALL    // 40mm x 30mm
  MEDIUM   // 55mm x 40mm
  LARGE    // 65mm x 45mm
}
```

## Detailed User Flows

### 1. New User Onboarding Flow

```
Landing Page
    ↓
Sign Up (Email/Google/GitHub)
    ↓
Email Verification
    ↓
Profile Setup
    - First Name, Last Name
    - Company Name
    - Role Selection
    - Phone Number (optional)
    ↓
Welcome Dashboard
    - Quick Tour (optional)
    - Create First Project
    - View Sample Project
```

### 2. Project Creation Flow

```
Dashboard → "New Project" Button
    ↓
Project Information Form
    - Project Name*
    - Project Code* (auto-generated or custom)
    - Client Name*
    - Contractor Name*
    - Address*
    - Start Date*
    - Expected End Date*
    - Description (optional)
    ↓
Project Settings Configuration
    - Choose Template:
        • Construction Snagging (default)
        • Property Inspection
        • Quality Control
        • Safety Audit
        • Custom
    - Customize Column Headers:
        • Item Label (default: "Snag")
        • Number Label (default: "No.")
        • Location Label (default: "Location")
        • Photo Label (default: "Photo")
        • Description Label (default: "Description")
        • Solution Label (default: "Solution")
        • Status Label (default: "STATUS")
    - Display Settings:
        • Photo Size (Small/Medium/Large)
        • Rows per PDF page (3-10)
    ↓
Category Setup
    - Add Common Categories (quick select):
        □ Entrance
        □ Living Room
        □ Kitchen
        □ Master Bedroom
        □ Bathrooms
        □ Balcony
        □ Utility Areas
    - Add Custom Categories:
        • Category Name
        • Category Code (3-4 letters)
        • Order/Sequence
    ↓
Team Invitation (optional)
    - Invite by Email
    - Set Roles (Inspector/Contractor/Viewer)
    ↓
Project Created → Redirect to Project Dashboard
```

### 3. Inspection/Item Creation Flow

```
Project Dashboard
    ↓
Select Category Card (e.g., "Entrance Box")
    - Shows: Total Items, Open Items, Progress %
    ↓
Category View
    - Breadcrumb: Projects > Villa Marina > Entrance Box
    - "Add New [Item]" Button (uses custom label)
    - Filter/Sort Options
    - View Toggle (Table/Gallery)
    ↓
Create New Item Form
    ↓
Step 1: Photo Capture (Primary Focus)
    - Camera Button (mobile)
    - Upload Button (desktop/mobile)
    - Drag & Drop Area
    - Multiple Photos (up to 10)
    - Photo Preview with Delete Option
    - Add Markup/Annotation (optional):
        • Draw circles
        • Add arrows
        • Highlight areas
    ↓
Step 2: Location Details
    - Pre-filled: Category (e.g., "Entrance Box")
    - Auto-generated: Number (e.g., "ENT-001")
    - Specific Location* (text field with suggestions)
        • "Near main door"
        • "Left wall"
        • "Ceiling area"
    ↓
Step 3: Description
    - Description Text* (multiline)
    - Voice-to-Text Option (mobile)
    - Common Templates:
        • "Water damage on..."
        • "Crack in..."
        • "Missing..."
        • "Damaged..."
    ↓
Step 4: Additional Details
    - Priority: Low/Medium/High/Critical
    - Proposed Solution (optional)
    - Assign To (dropdown of team members)
    - Due Date (optional)
    ↓
Step 5: Review & Save
    - Preview of item
    - Save as Draft / Save & Create Another / Save & Close
    ↓
Success → Return to Category View
    - Toast notification: "ENT-001 created successfully"
    - Real-time update for other users
```

### 4. Item Management Flow

```
Category View → Click on Item Row/Card
    ↓
Item Detail View
    - Full-size Photo Gallery
    - All Item Information
    - Status History Timeline
    - Comments Section
    ↓
Available Actions:
    ├── Update Status
    │   - Select New Status
    │   - Add Comment (required)
    │   - Notification sent to assignee
    │
    ├── Edit Details
    │   - Modify any field
    │   - Add/Remove photos
    │   - Change assignment
    │
    ├── Add Comment
    │   - Text comment
    │   - @mention team members
    │   - Attach files
    │
    └── More Actions
        - Print this item
        - Duplicate item
        - Delete item (with confirmation)
```

### 5. Status Update Flow

```
Current Status: OPEN
    ↓
Click "Update Status" Button
    ↓
Status Selection Modal
    - Available transitions:
        • OPEN → IN_PROGRESS
        • OPEN → ON_HOLD
    - Reason/Comment* (required)
    - Notify Assignee? ☑
    ↓
Confirm Update
    ↓
Status Changed
    - Status history recorded
    - Email notification sent
    - Real-time update to all viewers
    - Activity feed updated
```

### 6. Report Generation Flow

```
Project/Category View → "Generate Report" Button
    ↓
Report Configuration
    - Report Type:
        • Full Project Report
        • Category Report
        • Status Report
        • Custom Filter Report
    - Filters:
        • Date Range
        • Status (multi-select)
        • Priority (multi-select)
        • Assigned To
        • Categories (if project report)
    - Options:
        • Include Photos ☑
        • Include Comments ☐
        • Include Status History ☐
    - Format:
        • PDF (default)
        • Excel
        • Print Preview
    ↓
Preview Report
    - Shows first page
    - Total pages indicator
    - Edit configuration option
    ↓
Generate & Download
    - Progress indicator
    - Auto-download when ready
    - Save to project files (optional)
```

### 7. Mobile-Specific Flow

```
Mobile App Launch
    ↓
Quick Actions Menu
    - Take Photo → Create Item
    - View Assigned Items
    - Sync Status
    ↓
Offline Mode Detection
    - Banner: "Working Offline"
    - Queue indicator
    ↓
Quick Photo Capture
    - Camera opens immediately
    - Take multiple photos
    - Quick markup tools
    - Save to queue
    ↓
Batch Upload When Online
    - Auto-sync notification
    - Progress indicator
    - Conflict resolution (if needed)
```

### 8. Search and Filter Flow

```
Any List View → Search Bar
    ↓
Search Options:
    - Global Search (across all projects)
    - Project Search
    - Category Search
    ↓
Advanced Filters Panel
    - Status: □ Open □ In Progress □ Closed
    - Priority: □ Critical □ High □ Medium □ Low
    - Date Range: From ___ To ___
    - Assigned To: [Multi-select dropdown]
    - Has Photos: ○ Yes ○ No ○ All
    - Location Contains: [Text field]
    ↓
Apply Filters
    - Results update instantly
    - Filter count badge shown
    - Save Filter Set (optional)
    ↓
Actions on Filtered Results:
    - Bulk Status Update
    - Bulk Assignment
    - Export Filtered Results
    - Clear Filters
```

### 9. Collaboration Flow

```
Multiple Users on Same Category
    ↓
Real-time Presence Indicators
    - Avatar bubbles of active users
    - "John is viewing this category"
    ↓
User A Creates New Item
    ↓
User B Sees:
    - Toast: "New item added"
    - List updates automatically
    - New item highlighted briefly
    ↓
Concurrent Editing Protection
    - User A opens ENT-001
    - User B opens ENT-001
    - User B sees: "John is editing this item"
    - Edits are merged if possible
    - Conflict resolution if needed
```

### 10. PDF Export Detail Flow

```
Generate PDF Request
    ↓
Processing Steps:
    1. Load Project Settings (custom headers)
    2. Fetch Items with Photos
    3. Optimize Images (compress, resize)
    4. Generate PDF Pages:
        - Page 1: Header + 4-5 items
        - Subsequent: 5 items per page
        - Automatic page breaks
    5. Add Page Numbers
    ↓
PDF Features:
    - A4 Portrait Layout
    - Photo-centric (70mm width)
    - Custom column headers
    - Status color coding
    - High-quality photo printing
    - Clickable table of contents (optional)
    ↓
Output Options:
    - Download immediately
    - Email to recipients
    - Save to project files
    - Print directly
```

### 11. Error Handling Flows

#### Photo Upload Error

```
Select/Capture Photo → Upload Fails
    ↓
Error Message: "Failed to upload photo"
    - Retry button
    - Save locally option
    - Skip this photo
    ↓
Retry with reduced quality option
```

#### Offline Conflict Resolution

```
Item edited offline by User A
Item edited online by User B
    ↓
Sync Attempt → Conflict Detected
    ↓
Conflict Resolution Dialog:
    - Show both versions
    - Options:
        • Keep mine
        • Keep theirs
        • Merge changes
        • Save as separate items
```

### 12. Settings Management Flow

```
Project Dashboard → Settings Icon
    ↓
Settings Tabs:
    ├── General
    │   - Project info
    │   - Status
    │   - Dates
    │
    ├── Labels & Display
    │   - Column headers
    │   - Status options
    │   - Photo settings
    │
    ├── Team
    │   - Member list
    │   - Invite new
    │   - Permissions
    │
    ├── Categories
    │   - Add/Edit/Delete
    │   - Reorder
    │   - Merge categories
    │
    └── Export
        - Default settings
        - Template management
        - Branding options
```

## A4 PDF Layout Specifications

### Page Setup

- **Size**: 210mm × 297mm (A4 Portrait)
- **Margins**: 15mm all sides
- **Content Area**: 180mm × 267mm

### Column Layout (Photo-Centric)

| Column      | Width            | Purpose           |
| ----------- | ---------------- | ----------------- |
| Number      | 15mm (8.3%)      | Item number       |
| Location    | 25mm (13.9%)     | Category/location |
| **Photo**   | **70mm (38.9%)** | **Main focus**    |
| Description | 35mm (19.4%)     | Issue details     |
| Solution    | 20mm (11.1%)     | Proposed fix      |
| Status      | 15mm (8.3%)      | Current state     |

### Row Specifications

- **Header**: 8mm height
- **Data Rows**: 50mm height
- **Photo Size**: 65mm × 45mm
- **Rows per Page**: 4-5 maximum

## Key Implementation Components

### 1. Projects List Page Component

```typescript
// app/(dashboard)/projects/page.tsx
export default async function ProjectsListPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Projects"
        action={
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        }
      />

      <div className="mb-6">
        <SearchAndFilters />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to get started"
          action={
            <Link href="/projects/new">
              <Button>Create Project</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Categories List Page Component

```typescript
// app/(dashboard)/projects/[projectId]/categories/page.tsx
export default async function CategoriesListPage({
  params
}: {
  params: { projectId: string }
}) {
  const project = await getProject(params.projectId);
  const categories = await getCategories(params.projectId);
  const stats = await getProjectStats(params.projectId);

  return (
    <div className="container mx-auto p-6">
      <Breadcrumb items={[
        { label: 'Projects', href: '/projects' },
        { label: project.name }
      ]} />

      <ProjectInfoBar project={project} stats={stats} />

      <PageHeader
        title="Categories"
        action={
          <div className="flex gap-2">
            <QuickAddCategories projectId={params.projectId} />
            <Link href={`/projects/${params.projectId}/categories/new`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            projectId={params.projectId}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3. Snags List Page Component (Photo-Centric Table)

```typescript
// app/(dashboard)/projects/[projectId]/categories/[categoryId]/snags/page.tsx
export default async function SnagsListPage({
  params
}: {
  params: { projectId: string; categoryId: string }
}) {
  const project = await getProject(params.projectId);
  const category = await getCategory(params.categoryId);
  const snags = await getSnags(params.categoryId);

  return (
    <div className="container mx-auto p-6">
      <Breadcrumb items={[
        { label: 'Projects', href: '/projects' },
        { label: project.name, href: `/projects/${project.id}/categories` },
        { label: category.name }
      ]} />

      <PageHeader
        title={`${category.name} ${project.settings?.itemLabel || 'Snags'}`}
        stats={<CategoryStats category={category} />}
        action={
          <div className="flex gap-2">
            <ViewToggle />
            <ExportButton
              project={project}
              category={category}
              snags={snags}
            />
            <Link href={`/projects/${params.projectId}/categories/${params.categoryId}/snags/new`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add {project.settings?.itemLabel || 'Snag'}
              </Button>
            </Link>
          </div>
        }
      />

      <FiltersBar />

      <div className="mt-6">
        <SnagsTable
          snags={snags}
          settings={project.settings}
          categoryCode={category.code}
        />
      </div>
    </div>
  );
}
```

### 4. Navigation Components

```typescript
// components/layout/NavigationBreadcrumb.tsx
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-orange-600"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// components/layout/MobileBottomNav.tsx
export function MobileBottomNav() {
  const pathname = usePathname();
  const { projectId, categoryId } = useParams();

  const getAddLink = () => {
    if (pathname.includes('/snags')) {
      return `/projects/${projectId}/categories/${categoryId}/snags/new`;
    } else if (pathname.includes('/categories')) {
      return `/projects/${projectId}/categories/new`;
    } else {
      return '/projects/new';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
      <div className="grid grid-cols-4 h-16">
        <Link href="/projects" className="flex flex-col items-center justify-center">
          <FolderOpen className="w-5 h-5" />
          <span className="text-xs mt-1">Projects</span>
        </Link>

        {categoryId && (
          <Link
            href={`/projects/${projectId}/categories/${categoryId}/snags`}
            className="flex flex-col items-center justify-center"
          >
            <List className="w-5 h-5" />
            <span className="text-xs mt-1">Current</span>
          </Link>
        )}

        <Link
          href={getAddLink()}
          className="flex flex-col items-center justify-center text-orange-600"
        >
          <PlusCircle className="w-8 h-8" />
        </Link>

        <Link href="/profile" className="flex flex-col items-center justify-center">
          <User className="w-5 h-5" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </div>
  );
}
```

### 5. List Components

```typescript
// components/projects/ProjectCard.tsx
export function ProjectCard({ project }: { project: Project }) {
  const stats = useProjectStats(project.id);

  return (
    <Link href={`/projects/${project.id}/categories`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{project.name}</CardTitle>
              <p className="text-sm text-gray-500">{project.code}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Client:</span>
              <span className="ml-2 font-medium">{project.clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{stats.openSnags} open</span>
              <span>{stats.totalSnags} total</span>
            </div>
            <ProgressBar value={stats.completionPercentage} />
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-500">
          Last updated {formatRelativeTime(project.updatedAt)}
        </CardFooter>
      </Card>
    </Link>
  );
}

// components/categories/CategoryCard.tsx
export function CategoryCard({
  category,
  projectId
}: {
  category: Category;
  projectId: string;
}) {
  const stats = useCategoryStats(category.id);

  return (
    <Link href={`/projects/${projectId}/categories/${category.id}/snags`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <Badge variant="outline">{category.code}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.openSnags}
              </p>
              <p className="text-xs text-gray-500">Open</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalSnags}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
          <ProgressBar value={stats.completionPercentage} />
          <div className="mt-2 text-xs text-gray-500">
            {stats.inProgressSnags > 0 && (
              <span>{stats.inProgressSnags} in progress</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

## File Structure

```
snagio/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   ├── [projectId]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   ├── categories/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [categoryId]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── snags/
│   │   │   │   │           ├── page.tsx
│   │   │   │   │           ├── new/
│   │   │   │   │           └── [snagId]/
│   │   │   │   └── reports/
│   ├── api/
│   │   ├── projects/
│   │   ├── snags/
│   │   └── export/
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx
│   │   └── ProjectSettingsForm.tsx
│   ├── categories/
│   │   ├── CategoryCard.tsx
│   │   └── CategorySelector.tsx
│   ├── snags/
│   │   ├── SnagForm.tsx
│   │   ├── SnagTable.tsx
│   │   ├── PhotoUploader.tsx
│   │   └── PhotoAnnotator.tsx
│   ├── export/
│   │   ├── PDFGenerator.tsx
│   │   └── ExportButton.tsx
│   └── shared/
│       ├── BreadcrumbNav.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── prisma.ts
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useRealtime.ts
│   ├── useOffline.ts
│   └── useProjectSettings.ts
├── types/
│   ├── database.ts
│   └── supabase.ts
├── stores/
│   ├── authStore.ts
│   ├── projectStore.ts
│   └── offlineStore.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── supabase/
│   └── migrations/
├── public/
├── styles/
│   └── globals.css
├── .env.local
├── middleware.ts
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Key Features to Implement

### 1. Customizable Templates

- Construction Snagging
- Property Inspection
- Quality Control
- Safety Audit
- Maintenance Log
- Custom Template

### 2. Photo Features

- Multiple photos per item
- Photo annotation/markup
- Automatic compression
- Thumbnail generation
- Offline photo storage

### 3. Offline Capability

- Service Worker implementation
- IndexedDB for local storage
- Sync queue for offline changes
- Conflict resolution

### 4. Real-time Features

- Live status updates
- Presence indicators
- Collaborative editing
- Activity feed

### 5. Export Options

- PDF with custom headers
- Excel export
- Email reports
- Batch printing

### 6. Mobile Optimizations

- Touch-friendly interface
- Camera integration
- GPS location capture
- Offline mode indicator

## API Endpoints

```typescript
// Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
PUT    /api/projects/:id/settings

// Categories
GET    /api/projects/:projectId/categories
POST   /api/projects/:projectId/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

// Snags
GET    /api/categories/:categoryId/snags
POST   /api/categories/:categoryId/snags
GET    /api/snags/:id
PUT    /api/snags/:id
DELETE /api/snags/:id
PATCH  /api/snags/:id/status

// Photos
POST   /api/snags/:snagId/photos
DELETE /api/photos/:id
PUT    /api/photos/:id/markup

// Export
POST   /api/export/pdf
POST   /api/export/excel
GET    /api/export/:id
```

## Supabase Setup

### 1. Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('snag-photos', 'snag-photos', true),
  ('project-assets', 'project-assets', true),
  ('user-avatars', 'user-avatars', true);
```

### 2. RLS Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE snags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

-- Project settings policies
CREATE POLICY "Users can view settings for their projects" ON project_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_settings.project_id
      AND (p.created_by_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM categories c
             JOIN snags s ON s.category_id = c.id
             WHERE c.project_id = p.id
             AND (s.created_by_id = auth.uid() OR s.assigned_to_id = auth.uid())
           ))
    )
  );

CREATE POLICY "Project owners can update settings" ON project_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_settings.project_id
      AND p.created_by_id = auth.uid()
    )
  );
```

### 3. Database Functions

```sql
-- Auto-increment snag numbers per category
CREATE OR REPLACE FUNCTION increment_snag_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.number := COALESCE(
    (SELECT MAX(number) + 1
     FROM snags
     WHERE category_id = NEW.category_id),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_snag_number
  BEFORE INSERT ON snags
  FOR EACH ROW
  EXECUTE FUNCTION increment_snag_number();
```

## Development Steps

### Phase 1: Core Setup (Week 1)

1. Initialize Next.js project with TypeScript
2. Set up Supabase project and authentication
3. Configure Prisma with schema
4. Implement basic auth flow
5. Create project CRUD operations

### Phase 2: Main Features (Week 2-3)

1. Implement Project → Category → Snag hierarchy
2. Build photo upload with Supabase Storage
3. Create customizable settings system
4. Implement snag table with photo focus
5. Add status management workflow

### Phase 3: Advanced Features (Week 4)

1. Implement PDF export with custom headers
2. Add real-time collaboration
3. Build offline capability
4. Create mobile-optimized views
5. Add photo annotation features

### Phase 4: Polish & Deploy (Week 5)

1. Performance optimization
2. Comprehensive testing
3. Documentation
4. Deployment setup
5. User training materials

## Testing Requirements

```typescript
// Example test for custom headers
describe('Project Settings', () => {
  it('should save custom column headers', async () => {
    const settings = {
      itemLabel: 'Issue',
      descriptionLabel: 'Problem Description',
      solutionLabel: 'Recommended Action',
    }

    const updated = await updateProjectSettings(projectId, settings)
    expect(updated.itemLabel).toBe('Issue')
  })

  it('should apply custom headers in PDF export', async () => {
    const pdf = await generatePDF(project, snags)
    expect(pdf).toContain('Problem Description')
  })
})
```

## Success Criteria

1. **Flexibility**: System adapts to multiple use cases through customization
2. **Usability**: Non-technical users can configure and use effectively
3. **Performance**: Handles 10,000+ items per project
4. **Reliability**: Works offline with automatic sync
5. **Quality**: Professional PDF exports matching original design

## Important Notes

1. **Photo-Centric Design**: Photos are the primary focus (70mm width, 38.9% of table)
2. **A4 Portrait Layout**: Strictly formatted for A4 printing with 4-5 items per page
3. **Customizable Headers**: All column names can be changed per project
4. **Hierarchical Navigation**: Always maintain Project → Category → Item structure
5. **Offline First**: Design for intermittent connectivity on construction sites
