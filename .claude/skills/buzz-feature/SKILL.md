---
name: buzz-feature
description: Full workflow for adding new features to Buzz Events
metadata:
  author: dmgnr
  version: 1.0.0
---

# Buzz — Adding & Modifying Features

This skill covers the full workflow for adding new features — from routing and server actions to admin panels and real-time updates.

## Project Conventions

### Path aliases

| Alias | Maps to              |
| ----- | -------------------- |
| `@/*` | `./*` (project root) |
| `$/*` | `./lib/*`            |
| `#/*` | `./public/*`         |

### Tech choices

| Concern       | Choice                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| Styling       | Tailwind CSS v4, shadcn/ui (Radix primitives), `cn()` from `@/lib/utils`   |
| Forms         | Custom `FormProvider`/`FormInput`/`FormAction` system with autosave        |
| Data fetching | Server components (async, direct `db` calls) + React `Suspense` boundaries |
| Mutations     | Server actions (`"use server"`) with Zod validation                        |
| Real-time     | Redis pub-sub → SSE via `EventSourceEndpoint`                              |
| Auth          | `better-auth` — server `adminCheck()`, client `createAuthClient()`         |
| State         | React context, ICC (`IccProvider`/`shared.state`), no global state lib     |
| Icons         | `lucide-react`                                                             |

### Key principles

- **Client/server split**: Pages are async server components; wrap interactive parts in client components. Use `"use client"` only where needed (event handlers, state, effects).
- **Server actions** in `lib/api.ts` (cross-feature) or per-feature `api.ts` — never inline in page files.
- **useEffect** is ONLY for synchronizing with external systems (non-React widgets, browser APIs, network subscriptions). Do NOT use for:
  - Data transformation — compute during render instead
  - User events — put logic in the event handler
  - Chaining state updates — calculate all related updates together
  - Notifying parents — call the callback alongside setState
  - Resetting state on prop change — use the prop as the component's `key` instead
- **SSE events**: Use the typed `sse`/`tlSse()` endpoints — never publish raw Redis messages.
- **Admin actions** always call `adminCheck()` first and log via `actionLog()`.
- **OG images**: Dynamic `ImageResponse` in `opengraph-image.ts` files per route.

## Adding a Public Feature Page

### 1. Create route

```
app/(ui)/<feature>/
  page.tsx            # Server component — fetch data, render layout
  client.tsx          # Client component(s) — interactivity
  form.tsx            # Form wrapper (server action submission)
  api.ts              # Server actions (if per-feature)
  rules.tsx           # Rules/help dialog (if needed)
  opengraph-image.ts  # Dynamic OG image (if needed)
```

**Pattern for `page.tsx`:**

```tsx
import { Suspense } from "react";
import { FeatureClient } from "./client";

export default function FeaturePage() {
  return (
    <Suspense fallback={<Loading />}>
      <FeatureClient />
    </Suspense>
  );
}
```

### 2. Add server actions

For cross-feature actions, add to `lib/api.ts`. For per-feature actions, create `app/(ui)/<feature>/api.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { adminCheck } from "$/auth";
import { db } from "$/db";
import { actionLog } from "$/api";

export async function submitSomething(formData: FormData) {
  // validation with zod
  // mutate db
  // revalidatePath(...)
  // publish SSE event
  // return result
}
```

### 3. Create form (using form system)

Use `FormProvider`/`FormInput`/`FormAction` from `@/components/form`:

```tsx
"use client";

import { FormProvider, FormInput, FormAction } from "@/components/form";

export function FeatureForm() {
  return (
    <FormProvider id="feature-form">
      <FormInput name="name" label="Name" required />
      <FormAction action={submitSomething}>Submit</FormAction>
    </FormProvider>
  );
}
```

The form system auto-saves to localStorage (keyed by `id`, 10-min TTL) and restores on remount.

### 4. Add live SSE updates

Define events in `lib/db/sse-endpoints.ts`:

```ts
export const sse = sseEndpointMap({
  ...existing,
  myFeature: {
    update: z.object({ type: z.enum(["action1", "action2"]) }),
  },
});
```

Publish in your server action:

```ts
sse.myFeature.pub("update", { type: "action1" });
```

Subscribe on the client:

```ts
useEffect(() => {
  const { clean } = sse.myFeature.sub("update", (data) => {
    // handle update
  });
  return clean;
}, []);
```

For dynamic topics (e.g. per-tierlist), use `tlSse(listId)`:

```ts
// Server
tlSse(listId).pub("update_states", states);

// Client — use EventSourceEndpoint directly:
const endpoint = sseEndpoint(`tl.${listId}`, {
  update_states: z.custom<(typeof tierlistStates.$inferSelect)[]>(),
});
endpoint.sub("update_states", (data) => { ... });
```

SSE endpoints are served via `app/sse/[topic]/route.ts`.

### 5. Add OG image

Create `opengraph-image.ts` using `@/lib/og`:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };

export default function OGImage() {
  return new ImageResponse(
    <div
      style={
        {
          /* ... */
        }
      }
    >
      Buzz Feature
    </div>,
    { ...size },
  );
}
```

## Adding an Admin Feature Page

### 1. Route structure

```
app/(ui)/admin/
  layout.tsx        # Sidebar layout — already includes auth check
  page.tsx          # Dashboard
  <feature>/
    page.tsx        # List/manage page
    client.tsx      # Client components
    api.ts          # Server actions
  @modal/
    <feature>/
      [id]/page.tsx       # Edit modal
      create/page.tsx     # Create modal
    default.tsx           # Returns empty div when no modal active
```

### 2. Layout already handles auth

`app/(ui)/admin/layout.tsx` checks `adminCheck()` and redirects to `/login` if unauthenticated. It also renders `{modal}` for parallel route modals.

### 3. Add sidebar navigation

In `app/(ui)/admin/layout.tsx`, add a `SidebarMenuItem`:

```tsx
<SidebarMenuItem>
  <SidebarLink href="/admin/<feature>">
    <IconComponent />
    Feature Name
  </SidebarLink>
</SidebarMenuItem>
```

### 4. List/manage page

```tsx
// app/(ui)/admin/<feature>/page.tsx
import { db } from "$/db";
import { FeatureClient } from "./client";

export default async function AdminFeaturePage() {
  const items = await db
    .select()
    .from(featureTable)
    .orderBy(featureTable.order);
  return <FeatureClient items={items} />;
}
```

### 5. Parallel route modal for create/edit

Create modal (`@modal/<feature>/create/page.tsx`):

```tsx
import { ModalBase } from "@/components/modal";
import { CreateForm } from "./overrides";

export default function CreateModal() {
  return (
    <ModalBase title="Create Item">
      <CreateForm />
    </ModalBase>
  );
}
```

The `ModalBase` component wraps a `Dialog` that closes via `router.back()`.

For editing, use `[id]/page.tsx` with the same pattern, fetching the item by ID server-side.

The parallel route renders inside `{modal}` in the admin layout. `@modal/default.tsx` returns an empty div when no modal route is matched.

### 6. Server actions with admin check

```ts
export async function updateItem(id: string, data: FormData) {
  if (!(await adminCheck())) throw "Unauthorized";
  // validate with zod
  // update db
  revalidatePath("/admin/<feature>");
  await actionLog(`Updated item ${id}`, data);
  // publish SSE if needed
}
```

### 7. Audit logging

Every admin mutation must call `actionLog(text, details?)` from `$api`:

```ts
await actionLog("Description of what happened", optionalDetails);
```

This inserts into the `auditLog` table, revalidates the log page, and publishes an SSE update for the live log view.

### 8. CDN assets

For features that need image/file uploads:

- Use `CdnChooserProvider` + CDN chooser component from `@/components/chooser`
- Upload via `cdnify()` from `$api` (returns the CDN record ID)
- Reference CDN IDs in your DB schema as foreign keys to `cdn` table
- Check references before deletion via `checkCdnRefs()` from `$api`
- CDN references are tracked automatically in the `cdn_references` view

### 9. TanStack Table for data display

For list views with sorting/selection/context menus:

```tsx
import { DataTable } from "@/components/tantable";
import { columns } from "./columns";
```

The `DataTable` component supports row selection, context menus, empty states, and search.

## API Routes (non-server-action endpoints)

Create under `app/api/<feature>/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // ...
  return NextResponse.json(data);
}
```

Patterns used in this project:

- **Proxy routes**: `/api/enka/[uid]`, `/api/amber/char` — forward to external APIs
- **Count routes**: `/api/artifact/count`, `/api/rubgram/count` — quick aggregate queries
- **Health check**: `/api/health` — returns status of DB, Enka, Amber, Redis
- **State endpoints**: `/api/tl/[ver]/states` — REST-like read model for client

## Working with the form system

The form system (`@/components/form.tsx`) provides:

- **`FormProvider`**: Creates form context with autosave. Accepts `id` (storage key), optional `defaultValues`, and optional `clean` callback.
- **`FormInput`**: Renders a labeled input bound to the form context. Supports `name`, `label`, `required`, `type`, `placeholder`, and `children` (for custom input elements).
- **`FormAction`**: A submit button that calls the server action, handles loading state, shows toast on success/error, and optionally closes a dialog.
- **`FormRow`**: Wraps fields in a horizontal or vertical layout row.

```tsx
<FormProvider
  id="my-form"
  clean={() => {
    /* on success */
  }}
>
  <FormInput name="title" label="Title" required />
  <FormInput name="description" label="Description" />
  <FormAction action={submitAction}>Save</FormAction>
</FormProvider>
```

Typed forms (for complex data shapes) should define a `TypedFormData` type in a `type.d.ts` file within the feature directory.
