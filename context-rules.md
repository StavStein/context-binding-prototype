# Context Rules & Decisions

Hierarchy rules, enforcement behavior, scope resolution, and product decisions for context instances. For core concepts and definitions see [context.md](./context.md).

---

## Page Types

### Static Page

A regular page (Homepage, About, Contact) with no built-in data identity.

```
Page: [shared context instances, added by user]
├── Section A: [section-specific instances]
│   └── Container: [container-specific instances]
├── Section B: [section-specific instances]
└── Section C: [empty — inherits from page only]
```

- No primary context — the page starts with no data
- Page level holds instances that are **shared across sections**
- Section level holds instances that are **specific to that section**

### Dynamic Page

A page that represents a specific data item (Product Page, Blog Post).

```
Page: [primary context 🔒 (object, URL-driven)] + [optional shared instances]
├── Section A: [related instances]
└── Section B: [related instances]
```

- Primary context is **locked** — it comes with the page and cannot be removed
- Sections add related data sources, often with a **relationship** to the primary
- Example: page holds Current Product (object, primary), section holds Store Locations (list, filtered by the current product)

---

## Hierarchy Rules

### Rule 1 — One instance per context type per scope

A given scope (page, section, or container) can hold **at most one instance** of any given context type.

If two different views of the same data are needed within the same section, they should be placed on **separate containers** within that section — each container scopes its own instance:

```
Section
├── Container "Featured": cms.articles (filter: featured = true)
│   └── Repeater → featured articles
└── Container "Latest":   cms.articles (sort: date desc)
    └── Repeater → latest articles
```

**Why:** Two instances of the same type on the same scope would be ambiguous — an element wouldn't know which one to bind to. Containers provide the scoping boundary that makes each instance unambiguous.

### Rule 2 — No same context type across parent-child levels

The same context type cannot have instances at both a parent and child scope (e.g., page + section, section + container).

If a context type is instantiated at page level, all sections inherit access to it. Adding another instance of the same type to a section creates ambiguity about which instance an element is binding to.

**If a section needs a different view of page-level data:** remove the instance from the page and give each section its own configured instance. Or, place the filtered instance inside a **container** within the section, so the page-level instance remains accessible to elements outside that container.

**Exception — different context types from the same provider:** A primary context (`object`, URL-driven) at page level and a `list` context from the same provider at section level are allowed, because they are different context types serving fundamentally different purposes:
- Page: `wixStores.currentProduct` (object, primary) — the page's identity
- Section: `wixStores.products` (list) — a list of related products

These are **different context types**, not two instances of the same type.

### Rule 3 — Instance placement

When a user **adds** a context type, the instance is placed on the currently selected scope (section, container, or page).

When a user **duplicates** an existing instance, the new instance cannot be placed on the same scope as the original (Rule 1). The user is prompted to choose a target — a different section, a container within the same section, or page level.

If an instance needs to be shared across multiple sections, it can be promoted to page level via a "Promote to page" action.

### Rule 4 — Sibling sections are unrestricted

Two sibling sections can independently hold instances of the same context type. They are peers in the hierarchy (not parent-child), so there is no conflict.

```
Page
├── Section A: ctx_a8f3e2 (cms.articles, filter: featured)
└── Section B: ctx_b91c4d (cms.articles, sort: date desc)
```

Both sections use instances of the same CMS Articles type with different configurations. This is valid — each instance has its own unique ID.

---

## Scope Resolution

When an element opens the binding dropdown, available context instances are resolved by proximity:

| Priority | Source | Visual indicator |
|----------|--------|-----------------|
| 1 | Repeater item fields (if element is inside a repeater) | Scoped item fields, shown first |
| 2 | Instances on the element's direct container (if any) | **Section** badge (green) |
| 3 | Instances on ancestor containers / section | **Section** badge (green) |
| 4 | Instances on the page | **Page** badge (blue) |
| 5 | System contexts (always available) | Collapsed "System" group |

The binding dropdown shows all available sources from the full ancestry. For elements inside a repeater, item-level fields appear first (scoped to the current repeated item), followed by ancestor contexts.

Since Rule 2 prevents the same context type from having instances at multiple levels, there is never ambiguity about which instance an element is binding to.

---

## Enforcement Behavior

What happens when a user attempts each action:

| User action | System response |
|-------------|-----------------|
| Add a context type that already has an instance at page level | **Block.** Message: "Already available from page — use it directly in bindings." |
| Add a context type to a page when a section already has an instance of it | **Offer migration:** "Move to page level? It will be removed from the section and become available to all sections." |
| Add same context type to a scope that already has it | **Block.** The scope already has an instance of this type. |
| Duplicate a context instance | Create a new instance of the same type with a new unique ID. User chooses target scope (different section, container, or page). Cannot be placed on the same scope as the original. |
| Remove an instance from a page when sections have elements bound to it | **Confirmation** with warning listing affected elements. Bindings will be permanently removed. |
| Remove an instance from a section or container | **Confirmation** with warning if elements are bound to it. Bindings are permanently removed. |

---

## Product Decisions

Resolved questions and their decisions.

### Shadowing vs. strict prevention (Rule 2)
React Context supports "shadowing" — if you nest a provider of the same type inside another, the inner one overrides the outer one for its subtree. This would enable patterns like: "page provides the full product list, a section overrides with a filtered version." But it means two instances of the same type coexist in the ancestry, and the binding dropdown would show both.

**Decision: Do not allow shadowing.** Rule 2 strictly prevents the same context type from having instances at multiple hierarchy levels. If a section needs a different view, the user must either reorganize instances or use containers for scoping.

**Rationale:** Shadowing creates implicit behavior that's hard to debug — the user may not realize they're binding to a different instance depending on where the element sits. Strict prevention keeps the model predictable.

> **Needs team feedback:** Is strict prevention too limiting? Are there real use cases where shadowing would be necessary?

### Binding target: instance ID or context type?
When an element binds to a field, does the binding store a reference to the **instance ID** or the **context type**?

**Decision: Bind to context type, resolved by proximity.** Since shadowing is prevented, the nearest ancestor of a given context type is always unambiguous. This makes bindings resilient to reorganization — sections can be moved between pages and bindings survive as long as the target context type exists in the new ancestry.

> **Needs team feedback:** This decision ties to the no-shadowing rule. If shadowing is ever allowed, bindings would need to switch to instance IDs. Is the coupling acceptable?

### Instance removal
**Decision:** When a context instance is removed, all bindings to it are **deleted**. No orphaned state — clean removal.

### Repeater data source switch
When a repeater's Items property is reconnected to a different context (whether switched directly or disconnected and then reconnected), the system detects inner elements that still have bindings to the old context. A dialog prompts the user with two options:
- **Disconnect bindings** — removes all stale inner bindings, giving a clean slate for the new data source
- **Keep bindings** — preserves inner bindings as-is (for advanced users who may have cross-context references)

This check runs regardless of which path triggers the rebind (binding dropdown, skeleton CTA, or section context change).

### Custom Code contexts
**Decision:** Custom Code contexts follow the same flow as any other context — the user attaches them to a scope like any other context type. No special treatment needed.

### Container vs. Section badge
**Decision:** Same visual badge for both. No distinction needed.

---

## Open Questions

Questions that need product decisions before implementation.

### Relationships between instances
The dynamic page example mentions sections adding contexts "with a relationship to the primary" (e.g., Store Locations filtered by Current Product). How are relationships defined? Is it a configuration on the child instance ("filter by: primary context field X")? Is it automatic based on matching schemas? How is this surfaced in the UI?

**Status:** TBD — next conversation.

### Replace flow (section-level)
A user may want to keep the same design but switch the data source (e.g., reuse a Team Members section to show Articles instead). This is a "replace context" action — swap one context type for another. The system should attempt a **smart rebind**: match fields by name and type from the old context to the new one (`title` → `title`, `image` → `image`). Fields that don't match get disconnected.

### Section move/copy
When a section is moved or copied to another page, what happens to its context instances? What if the target page already has the same context type at page level?

### System context scope and configuration
System contexts are currently scoped to every page, but they represent site-wide data (business info, logged-in user, etc.). Should they be **site-level** rather than page-level — meaning configured once for the entire site rather than per page? And what configuration should they expose, if any? For example: should the user be able to filter the Page List context, or toggle which fields of Business Info are exposed?
