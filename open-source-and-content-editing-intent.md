# Open Source & Content Editing — User Intent & Flows

> This document explains **user intents** and **proposed solutions** for (1) opening the source of a context (list, code, dashboard) and (2) editing content or fixing calculated values at the element level. It is intended to align the team on needs and entry points.

---

## 1. Open Source — User Intent

**Why would a user want to "open the source"?**

- **"I want to see the entire list of entities"** — e.g. all products, all team members, all bookings. The context provides the data; the user wants to manage that dataset (add, remove, reorder, bulk edit) in the place where it lives.
- **"I want to see the code to change / review"** — for Custom Code contexts or Function Library. The user wants to jump to the file or dashboard where the logic or data is defined.

**Where does "Open Source" lead?**

| Source type | User expectation | Opens |
|-------------|------------------|--------|
| **CMS Collection** | Manage the collection (items, schema, permissions) | CMS Collection (content manager for that collection) |
| **Verticals / Wix Apps** (Stores, Bookings, etc.) | Manage entities in the app (products, services, etc.) | App dashboard — e.g. product list, bookings dashboard |
| **Custom Context** | View or edit the context provider code | Context code file (e.g. in IDE or code panel) |
| **Function Library** | View or edit the function that returns the value | Function library file (e.g. the file where the function is defined) |
| **TPAs** | TBD | TBD |

**Entry points (where the user can trigger "Open Source")**

- **Context card** — 3-dots menu and/or dedicated "Open Source" / "Open Collection" link in the card or in the configuration panel. *(Not applicable to Function Library — no context card for functions.)*
- **Context configuration panel** — Source link at the bottom (e.g. "Open Collection", "Open in Dashboard", "Open Source"). *(Function Library has no config panel; entry is from the property panel only.)*
- **Explore contexts modal** — When adding or exploring contexts, a way to open the source of a selected context.
- **Function Library** — No context card. The user opens the function source **from the property panel** when a property is bound to a function (e.g. "Defined in code — open source file"). Entry point is always **per property**.

These entry points are **context-level**: they answer "where does this context’s data/code live?" and take the user there for the whole context. **Function Library** is the exception: no context card, so "open source" is only at **property level** when a property is bound to a function.

---

## 2. Content & Item Editing — User Intent

**Why would a user want to edit content or fix a value?**

- **"I see a typo on the stage — I want to fix it"** — The value is displayed in a text element; the user wants to correct the content (e.g. fix a product title or a team member name).
- **"I have an updated picture — I want to replace it"** — The value is media (image, video); the user wants to swap it (e.g. new team member photo, new product image).
- **"I see the wrong value from my function — how do I fix it?"** — The value is **calculated** (function, formula, or dynamic binding). The user wants to understand where it comes from and fix the logic or the input, not edit the displayed string itself.

So we have two kinds of "editing":

| Kind | User intent | Where to fix it |
|------|-------------|-----------------|
| **Content** | Edit the content (text, replace media) | In the **source of the data** — e.g. CMS item, product in Stores, or inline on stage if allowed. |
| **Logic / calculated** | Fix wrong value from function or binding | In the **source of the logic** — e.g. function file, or the context/code that provides the value. |

---

## 3. Property-Level "Edit" / "Go to Source" (Proposed Solution)

To support **content editing** and **logic fixing** at the element level, we expose an action **per property** (e.g. Value, Source, Alt text) when that property is bound to a context.

**Entry point:** In the **property panel** (and, where relevant, in the text-edit panel or image controller), next to the bound chip we show a link such as:

- **CMS / Wix App:**  
  **"Edit 'items.title' in Dashboard"**  
  → Opens the **source of that field** (e.g. the collection or the app dashboard), with the expectation that the user can find and edit the **content** (the specific item/record or the list).

- **Custom Code context:**  
  **"Open source file"**  
  → Opens the context’s code file so the user can change the **data or logic** that backs that context.

- **Function Library (calculated value):**  
  **"Open source file"** (with optional function/code file name)  
  → Opens the **function file** so the user can fix the **logic** that produces the value.

So:

- **Content (typo, media):** The link is scoped to the **field** (e.g. `items.title`) and leads to the dashboard (CMS or app) where that content is stored. Label is generic: **"Edit in Dashboard"** (or "Edit 'field' in Dashboard").
- **Calculated / logic:** The link leads to the **code** (context file or function file) so the user can fix the implementation.

**Current implementation (prototype):**

- For CMS and Wix Apps: **"Edit 'items.title' in Dashboard"** (generic label; field name shown when available). Opens the relevant dashboard (CMS or app) where the user can edit the content.
- For Custom Code / Function: **"Open source file"** (or "Defined in code — open source file") linking to the context code or function file.

This gives the team a single, consistent story: **Open Source** at context level = "where does this context live?", and **Edit / Go to source** at property level = "where do I change this specific content or this specific logic?".

---

## 4. Item / Repeater Editing (Add or Edit One Item)

**User intents:**

- **"I want to edit one item"** — e.g. one product, one team member, one booking.
- **"I want to add another item to my repeater"** — e.g. add a new product to the list, a new team member.

**Flow (to be defined):**

- **Entry point:** e.g. from a **dynamic page** (item detail), or from the **repeater** (e.g. "Add item" or click on an item to edit).
- **Opens:** The **collection / app** at the right scope — e.g. the specific item in CMS or the "add new" flow in the app dashboard.

This is closely related to "Edit in CMS" / "Edit in [App]" at property level: both lead to the same backend (CMS or app), but **item/repeater editing** is about "which item" or "add item", while **property-level edit** is about "which field" and is triggered from the property panel.

---

## 5. Summary Table (Intent → Entry Point → Destination)

| User intent | Entry point | Destination / action |
|-------------|-------------|----------------------|
| See whole list / manage collection | Context card menu, Config panel source link | CMS Collection / App dashboard |
| See or edit context code | Context card, Config panel | Context code file |
| See or edit function code | **Property panel** only — "Open source file" when property is bound to a function (no context card for Function Library) | Function library file |
| Fix typo / replace media (content) | Property panel: "Edit '…' in Dashboard" | CMS or app dashboard (content) |
| Fix wrong calculated value | Property panel: "Open source file" | Function or context code file |
| Edit one item / add item to repeater | Dynamic page or repeater (TBD) | Collection / app at item scope |

---

## 6. Open Questions

- **Can / should the context provider declare the "open source" target in its manifest?** (e.g. URL or deep link for "Open Collection", "Open in Dashboard", or "Open code file".)
- **Item / repeater editing:** Exact entry points (e.g. "sausage" on dynamic page, "Add item" on repeater) and where each opens (collection vs. specific item) — to be aligned with product and platform.
- **TPAs:** How "Open Source" and "Edit" behave when the context is provided by a TPA.

---

*Document purpose: align the team on user intents and proposed solutions for Open Source and Content/Logic editing. Update as product and platform decisions are made.*
