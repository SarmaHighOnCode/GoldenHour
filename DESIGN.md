# GoldenHour Visual Identity & Design System

GoldenHour's visual language balances **calm urgency**—trustworthy like a medical device, fast like a 911 dispatch console. The interface is optimized for mobile-first, one-handed, glove-friendly usage during critical moments.

---

## 🎨 Color Palette

| Token | CSS Variable | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **bg** | `--color-bg` | `#FBFAF8` | Warm paper background for readability |
| **surface** | `--color-surface` | `#FFFFFF` | Card backgrounds, separated by soft shadows (no harsh borders) |
| **ink** | `--color-ink` | `#1A1714` | High-contrast readable typography |
| **muted** | `--color-ink-muted` | `#6B6560` | Secondary metadata and labels |
| **emergency** | `--color-emergency` | `#DC2626` | Primary CTAs, urgent warnings |
| **pressed** | `--color-emergency-pressed` | `#B91C1C` | Active/Pressed states for emergency actions |
| **success** | `--color-success` | `#059669` | Confirmed responses, lock status |
| **pending** | `--color-pending` | `#9CA3AF` | Warm gray for loading, pending, inactive states |
| **golden hour** | `--color-accent` | `#F59E0B` | Brand mark and subtle highlighting |

---

## 📐 Shape & Spacing

*   **Border Radius:**
    *   Cards: `rounded-2xl` (`1rem`)
    *   Buttons: `rounded-xl` (`0.75rem`)
*   **Touch Targets:**
    *   Primary Action Buttons: Minimum height of `56px` (`h-14`) for easy tap states.
*   **Shadows:**
    *   Soft layered shadows to create depth without borders:
        ```css
        box-shadow: 0 1px 3px rgba(26, 23, 20, 0.02), 0 8px 24px rgba(26, 23, 20, 0.04);
        ```

---

## ✍️ Typography

*   **Font Family:** Inter throughout (tightly tracked headings).
*   **Headings:** Bold, tight-tracked (`tracking-tight`), text sizes `text-3xl` or `text-4xl`.
*   **Body:** Generous line heights for readability.

---

## 🎬 Motion

*   **Buttons:** Click/tap feedback scale down (`scale-95`).
*   **Transitions:** Spring transitions for status/state changes (`framer-motion`).
*   **Card Entrances:** Staggered fade and slide-up transition.
