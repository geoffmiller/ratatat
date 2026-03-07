# Hooks

All hooks must be called inside a component rendered via `render()` (or `renderInline()`), which provides the required `RatatatContext`.

---

## useInput

Subscribe to keyboard input.

```tsx
import { useInput } from 'ratatat'

useInput((input, key) => {
  // input: the printable character pressed, or '' for special keys
  // key:   flags describing what was pressed
})
```

### Key object

| Field        | Type      | Description                 |
| ------------ | --------- | --------------------------- |
| `upArrow`    | `boolean` | ↑ arrow key                 |
| `downArrow`  | `boolean` | ↓ arrow key                 |
| `leftArrow`  | `boolean` | ← arrow key                 |
| `rightArrow` | `boolean` | → arrow key                 |
| `return`     | `boolean` | Enter key                   |
| `backspace`  | `boolean` | Backspace key               |
| `delete`     | `boolean` | Delete (forward-delete) key |
| `pageUp`     | `boolean` | Page Up                     |
| `pageDown`   | `boolean` | Page Down                   |
| `home`       | `boolean` | Home key                    |
| `end`        | `boolean` | End key                     |
| `tab`        | `boolean` | Tab key                     |
| `shift`      | `boolean` | Shift modifier (with Tab)   |
| `escape`     | `boolean` | Escape key                  |
| `ctrl`       | `boolean` | Ctrl modifier               |
| `meta`       | `boolean` | Meta/Alt modifier           |

### Examples

```tsx
useInput((input, key) => {
  if (key.upArrow) moveUp()
  if (key.downArrow) moveDown()
  if (key.return) submit()
  if (key.escape) cancel()
  if (key.ctrl && input === 'c') exit()
  if (key.ctrl && input === 'u') clearLine()
  if (!key.ctrl && !key.meta) handleChar(input) // printable character
})
```

---

## usePaste

Subscribe to bracketed paste events.

```tsx
import { usePaste } from 'ratatat'

usePaste((text) => {
  console.log('Pasted:', text)
})
```

When at least one `usePaste` listener is active, paste content is delivered **only** through `usePaste` — it does not flow through `useInput`. When no paste listeners are active, pasted text falls back through `useInput` as regular character input.

### Options

```tsx
usePaste(handler, { isActive: false }) // temporarily disable without unmounting
```

| Option     | Type      | Default | Description                     |
| ---------- | --------- | ------- | ------------------------------- |
| `isActive` | `boolean` | `true`  | Enable or disable this listener |

---

## useMouse

Subscribe to mouse events. Mouse tracking is enabled by default (SGR 1006).

```tsx
import { useMouse } from 'ratatat'

useMouse((event) => {
  // event.x, event.y      — 1-based terminal column/row
  // event.button          — 'left' | 'right' | 'middle' | 'scrollUp' | 'scrollDown'
  // event.shift, .ctrl, .meta — modifier flags
  if (event.button === 'left') {
    console.log(`Clicked at ${event.x},${event.y}`)
  }
  if (event.button === 'scrollUp') scrollUp()
})
```

### MouseEvent

| Field    | Type      | Description                                                           |
| -------- | --------- | --------------------------------------------------------------------- |
| `x`      | `number`  | Terminal column (1-based)                                             |
| `y`      | `number`  | Terminal row (1-based)                                                |
| `button` | `string`  | `'left'` \| `'right'` \| `'middle'` \| `'scrollUp'` \| `'scrollDown'` |
| `shift`  | `boolean` | Shift modifier                                                        |
| `ctrl`   | `boolean` | Ctrl modifier                                                         |
| `meta`   | `boolean` | Meta/Alt modifier                                                     |

---

## useTextInput

Managed text input with cursor positioning, editing shortcuts, and paste support.

```tsx
import { useTextInput } from 'ratatat'

const { value, cursor, setValue, clear } = useTextInput({
  onSubmit: (v) => handleSubmit(v),
  onChange: (v) => setPreview(v),
})

// Render the field with a visible cursor
return (
  <Text>
    {value.slice(0, cursor)}
    <Text inverse>{value[cursor] ?? ' '}</Text>
    {value.slice(cursor + 1)}
  </Text>
)
```

### Options

| Option         | Type                  | Default | Description                |
| -------------- | --------------------- | ------- | -------------------------- |
| `initialValue` | `string`              | `''`    | Starting value             |
| `onSubmit`     | `(v: string) => void` | —       | Called on Enter            |
| `onChange`     | `(v: string) => void` | —       | Called on every keystroke  |
| `isActive`     | `boolean`             | `true`  | Disable without unmounting |

### Return value

| Field      | Type                  | Description                                      |
| ---------- | --------------------- | ------------------------------------------------ |
| `value`    | `string`              | Current text                                     |
| `cursor`   | `number`              | Cursor position (0 = before first char)          |
| `setValue` | `(v: string) => void` | Set value programmatically (cursor moves to end) |
| `clear`    | `() => void`          | Clear the input                                  |

### Supported editing shortcuts

| Key           | Action                                |
| ------------- | ------------------------------------- |
| ← / →         | Move cursor                           |
| Home / Ctrl+A | Move to start                         |
| End / Ctrl+E  | Move to end                           |
| Backspace     | Delete char before cursor             |
| Delete        | Delete char after cursor              |
| Ctrl+U        | Kill to start of line                 |
| Ctrl+K        | Kill to end of line                   |
| Ctrl+W        | Kill word before cursor               |
| Enter         | Submit                                |
| Paste         | Inserts paste text at cursor position |

---

## useScrollable

Virtual scrolling for a fixed-height viewport over variable-height content.

```tsx
import { useScrollable } from 'ratatat'

const scroll = useScrollable({
  viewportHeight: 20, // how many rows are visible
  contentHeight: items.length, // total rows of content
})

return (
  <Box height={20} overflow="hidden">
    <Box marginTop={-scroll.offset}>
      {items.map((item, i) => (
        <Text key={i}>{item}</Text>
      ))}
    </Box>
  </Box>
)
```

Use `useInput` to drive scroll:

```tsx
useInput((input, key) => {
  if (key.upArrow) scroll.scrollUp()
  if (key.downArrow) scroll.scrollDown()
  if (key.pageUp) scroll.scrollBy(-10)
  if (key.pageDown) scroll.scrollBy(10)
  if (key.home) scroll.scrollToTop()
  if (key.end) scroll.scrollToBottom()
})
```

### Options

| Option           | Type     | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `viewportHeight` | `number` | Height of the visible window in rows            |
| `contentHeight`  | `number` | Total rows of content (update as content grows) |

### Return value

| Field              | Type                  | Description                     |
| ------------------ | --------------------- | ------------------------------- |
| `offset`           | `number`              | Current scroll offset (0 = top) |
| `scrollUp()`       | `() => void`          | Scroll up 1 row                 |
| `scrollDown()`     | `() => void`          | Scroll down 1 row               |
| `scrollBy(n)`      | `(n: number) => void` | Scroll by N rows                |
| `scrollToTop()`    | `() => void`          | Jump to top                     |
| `scrollToBottom()` | `() => void`          | Jump to bottom                  |
| `atTop`            | `boolean`             | Already at top                  |
| `atBottom`         | `boolean`             | Already at bottom               |

`scrollToBottom()` is idempotent — safe to call on every new item append.

---

## useFocus

Mark a component as focusable and know when it has focus.

```tsx
import { useFocus } from 'ratatat'

function Input() {
  const { isFocused } = useFocus({ autoFocus: true })

  return (
    <Box borderStyle={isFocused ? 'round' : 'single'}>
      <Text>{isFocused ? '> ' : '  '}</Text>
    </Box>
  )
}
```

### Options

| Option      | Type      | Default | Description                      |
| ----------- | --------- | ------- | -------------------------------- |
| `autoFocus` | `boolean` | `false` | Focus this component on mount    |
| `isActive`  | `boolean` | `true`  | Participate in focus cycling     |
| `id`        | `string`  | auto    | Stable ID for programmatic focus |

### Return value

| Field       | Type                   | Description                      |
| ----------- | ---------------------- | -------------------------------- |
| `isFocused` | `boolean`              | Whether this component has focus |
| `focus(id)` | `(id: string) => void` | Programmatically focus by ID     |

Tab cycles forward, Shift+Tab cycles backward — built in, no extra code.

---

## useFocusManager

Programmatically control focus cycling.

```tsx
import { useFocusManager } from 'ratatat'

const { focusNext, focusPrevious, focus, enableFocus, disableFocus, activeId } = useFocusManager()
```

| Method/Field      | Description                             |
| ----------------- | --------------------------------------- |
| `focusNext()`     | Focus next registered component         |
| `focusPrevious()` | Focus previous registered component     |
| `focus(id)`       | Focus a specific component by ID        |
| `enableFocus()`   | Enable focus cycling (default: enabled) |
| `disableFocus()`  | Disable focus cycling                   |
| `activeId`        | The currently focused component's ID    |

---

## useApp

Access app lifecycle controls.

```tsx
import { useApp } from 'ratatat'

const { exit } = useApp()

useInput((input, key) => {
  if (key.escape) exit()
})
```

| Method   | Description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| `exit()` | Clean shutdown (restores terminal, stops input, exits process) — Ink-compatible |
| `quit()` | Same as `exit()` — Ratatat-native name                                          |

---

## useWindowSize

Returns current terminal dimensions. Re-renders on terminal resize.

```tsx
import { useWindowSize } from 'ratatat'

const { columns, rows } = useWindowSize()
```

---

## useStdout / useStderr

Write to stdout or stderr without disturbing the TUI rendering.

```tsx
import { useStdout, useStderr } from 'ratatat'

const { write, stdout } = useStdout()
const { write: writeErr, stderr } = useStderr()

write('some output\n')
```

---

## useStdin

Access raw stdin stream and raw mode controls.

```tsx
import { useStdin } from 'ratatat'

const { stdin, setRawMode, isRawModeSupported } = useStdin()
```

---

## useBoxMetrics

Measure the computed layout dimensions of a `Box` ref.

```tsx
import { useBoxMetrics } from 'ratatat'
import React, { useRef } from 'react'

const ref = useRef(null)
const { width, height, left, top, hasMeasured } = useBoxMetrics(ref)

return <Box ref={ref}>...</Box>
```

Updates on every render and on terminal resize. Returns `{ width: 0, height: 0, left: 0, top: 0, hasMeasured: false }` until the first layout pass.

---

## measureElement

Imperative alternative to `useBoxMetrics`. Returns `{ width, height }` from a `LayoutNode` ref.

```tsx
import { measureElement } from 'ratatat'

const { width, height } = measureElement(ref.current)
```

---

## useIsScreenReaderEnabled

Stub — always returns `false`. Provided for Ink API compatibility.

```tsx
const isEnabled = useIsScreenReaderEnabled()
```

---

## useCursor

Stub — `setCursorPosition` is a no-op. Ratatat hides the cursor during rendering. Provided for Ink API compatibility.

```tsx
const { setCursorPosition } = useCursor()
```
