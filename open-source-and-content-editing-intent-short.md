# Open Source & Content Editing — Short (Meeting Deck)

## 1. Open Source (context level)

**User intent:** "I want to see the full list" / "I want to see the code."

| Source        | Opens to                    | Entry point |
|---------------|-----------------------------|-------------|
| CMS           | CMS Collection              | Context card, Config panel |
| Wix Apps      | App dashboard (e.g. list)   | Context card, Config panel |
| Custom Code   | Context code file           | Context card, Config panel |
| **Function Library** | Function code file   | **Property panel only** — no context card; "Open source file" when a property is bound to a function |

---

## 2. Content & logic editing (element level)

**User intent:** "I see a typo / wrong image" → fix **content**. "Wrong value from my function" → fix **logic**.

| Type      | Where to fix      | In editor we show                          |
|-----------|-------------------|--------------------------------------------|
| Content   | CMS / App (data)  | **"Edit 'items.title' in Dashboard"**      |
| Logic     | Code (function)   | **"Open source file"**                     |

**Entry point:** Property panel — link next to the bound chip (Value, Source, etc.).

---

## 3. One table

| Intent                    | Where user clicks           | Goes to                    |
|---------------------------|-----------------------------|----------------------------|
| Manage whole list         | Context card / Config panel | CMS or App dashboard       |
| See/edit context code     | Context card / Config panel | Context code file          |
| See/edit function code    | **Property panel only**     | Function library file      |
| Fix typo / replace media  | Property: "Edit '…' in Dashboard" | Content in CMS / App       |
| Fix wrong calculated value| Property: "Open source file" | Function / context file   |
| Edit one item / add item  | (TBD)                       | Collection / app, item scope |

---

**Open:** Manifest for "open" target? Item/repeater edit entry points? TPA behavior?
