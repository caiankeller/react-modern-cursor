# React Modern Cursor

A smooth custom cursor for React. The cursor follows moving targets, preserves its position across React route remounts, and supports open shadow roots. All nicely animated.

[Demonstration](https://caiankeller.com)

## Installation

```bash
npm install react-modern-cursor
```

```bash
bun add react-modern-cursor
```

React and React DOM 18 or newer are required.

## Usage

Render `<Cursor />` once near the root of your application.

Vite/CRA:

```tsx
import { Cursor } from "react-modern-cursor";

export default function App() {
  return (
    <>
      <YourRoutes />
      <Cursor />
    </>
  );
}
```

Next.js App Router:

```tsx
// app/layout.tsx
import { Cursor } from "react-modern-cursor";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Cursor />
      </body>
    </html>
  );
}
```

The package is already marked as a client component and supports server rendering.

## Automatic detection

The cursor chooses the first matching behavior:

1. The closest explicit `data-cursor` override
2. Links: `<a>` and `[role="link"]`
3. Interactive controls: buttons, `[role="button"]`, visible inputs, textareas, editable
   content, selects, summaries, `.clickable`, `[tabindex]` except `-1`, and elements with
   computed `cursor: pointer`.
4. Visible text beneath the pointer
5. The default dot

Text inputs, textareas, and editable content keep the browser's native I-beam cursor while the
custom border remains visible around the editable target.

Increase `textHitPadding` when small text needs a larger detection area:

```tsx
<Cursor textHitPadding={4} />
```

## Variants

Use `variant` to force one behavior for the entire cursor:

```tsx
<Cursor variant="button" />
```

| Variant | Behavior |
| ------- | -------- |
| `"default"` | Dot following the pointer |
| `"text"` | Text-height caret |
| `"link"` | Underline below the target |
| `"button"` | Border around the target |
| `"none"` | Hides the custom cursor and restores the native cursor |

`"clickable"` remains available as an alias for `"button"`.

### Per-element variants

Use `data-cursor` to override automatic detection. Children inherit the closest override.

```tsx
<div data-cursor="text">Always use the text cursor</div>

<div data-cursor="button" onClick={() => {}}>
  Interactive card
</div>

<button data-cursor="link">Link-style button</button>

<video data-cursor="none" src="video.mp4" />
```

Change the override attribute name with `cursorAttribute`:

```tsx
<Cursor cursorAttribute="data-pointer" />
<div data-pointer="button">Interactive card</div>
```

This only changes the variant override attribute. The `data-cursor-*` option attributes remain
unchanged.

## Color

Pass any CSS color value to apply it to every visual variant:

```tsx
<Cursor color="#ff3b30" />
```

Pass an object to set colors by variant:

```tsx
<Cursor
  color={{
    default: "#fff",
    text: "#7c3aed",
    link: "#0ea5e9",
    button: "#ff3b30",
  }}
/>
```

Use `"currentColor"` to follow the hovered target's computed **text** color:

```tsx
<Cursor color={{ link: "currentColor", button: "currentColor" }} />
```

The cursor uses `mix-blend-mode: difference` by default. Override it through `style` when a
literal color is preferred:

```tsx
<Cursor color="#ff3b30" style={{ mixBlendMode: "normal" }} />
```

But `mix-blend-mode: difference` will allow people see throught the hovering element always.

## Spacing and offset

For links, `spacing` controls the distance between the underline and target. For buttons, it
controls the padding around the target.

```tsx
<Cursor spacing={8} />

<Cursor spacing={{ link: 4, button: 12 }} />
```

Use `offset` to shift every variant, or provide offsets by variant:

```tsx
<Cursor offset={{ x: 2, y: 4 }} />

<Cursor
  offset={{
    default: { x: 2, y: 4 },
    text: { x: 1 },
    link: { y: 2 },
    button: { y: 1 },
  }}
/>
```

Use it to make the cursor closer of further form the element.

## Per-element options

Override color, spacing, or offset on a specific target:

```tsx
<button
  data-cursor-color="#ff3b30"
  data-cursor-spacing="14"
  data-cursor-offset-x="2"
  data-cursor-offset-y="1"
>
  Delete
</button>
```

| Attribute | Behavior |
| --------- | -------- |
| `data-cursor-color` | Overrides the resolved cursor color |
| `data-cursor-spacing` | Overrides link distance or button padding |
| `data-cursor-offset-x` | Overrides the horizontal offset |
| `data-cursor-offset-y` | Overrides the vertical offset |

Element attributes take priority over variant-specific props, shared props, and built-in
defaults.

## Responsive and conditional behavior

The custom cursor is disabled at viewport widths of `768px` or less by default:

```tsx
<Cursor hideMediaQuery="(pointer: coarse)" />
```

Pass an empty query to keep it enabled at every viewport size:

```tsx
<Cursor hideMediaQuery="" />
```

Disable it directly when needed:

```tsx
<Cursor disabled={isModalOpen} />
```

Disabling the component restores the native cursor. The custom cursor resumes at the latest
pointer position when enabled again.

## Layer styling

Use `className`, `style`, and `zIndex` to customize the rendered cursor layer:

```tsx
<Cursor
  /* you can make the custom cursor a squircle, you can also reduce border-radius */
  className="corner-squircle"
  style={{ mixBlendMode: "normal", filter: "drop-shadow(0 0 4px #fff)" }}
  zIndex={10000}
/>
```

The layer always keeps fixed positioning and `pointer-events: none`, so it cannot intercept
clicks or move with page content.

## Props

| Prop | Default | Description |
| ---- | ------- | ----------- |
| `variant` | Auto-detected | Forces `"default"`, `"text"`, `"link"`, `"button"`, or `"none"` |
| `cursorAttribute` | `"data-cursor"` | Attribute used for per-element variant overrides |
| `color` | `"#fff"` | Shared CSS color or colors keyed by visual variant |
| `spacing` | Link `3`, button `6` | Shared spacing or spacing keyed by `"link"` and `"button"` |
| `offset` | `{ x: 0, y: 0 }` | Shared x/y offset or offsets keyed by visual variant |
| `textHitPadding` | `2` | Extra pixels around text used during text detection |
| `hideMediaQuery` | `"(max-width: 768px)"` | Media query that disables the custom cursor |
| `disabled` | `false` | Disables listeners and restores the native cursor |
| `className` | - | Class added to the cursor layer |
| `style` | - | Inline styles added to the cursor layer |
| `zIndex` | `9999` | Cursor layer z-index |

## License

[MIT](LICENSE)
