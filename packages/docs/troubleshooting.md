# Troubleshooting

---

## "Device not configured" (os error 6)

**Cause:** stdin is not attached to a real TTY.

Common failure cases:

```bash
./app > output.log
printf '' | ./app
```

Run in an interactive terminal session instead.

---

## Terminal left in raw mode after crash

If the process dies hard (`kill -9`, OOM, host crash), cleanup hooks do not run.

Recovery in the same terminal:

```bash
reset
# or
stty sane
```

---

## Blank screen / no visible output

Check these first:

1. Root component renders visible content (not `null`)
2. App is in a real TTY
3. Terminal emulator supports alternate screen mode

---

## Input not responding

Checklist:

- `process.stdin.isTTY === true`
- In React mode, use `render()` (it starts input parser + app lifecycle)
- In raw-buffer mode, create a `TerminalGuard` before your loop

---

## Mouse events not firing

- React mode enables mouse tracking by default
- Raw-buffer mode needs `new TerminalGuard(true)`
- Confirm your terminal supports SGR mouse tracking (1006)

---

## Paste not routed to `usePaste`

Routing behavior is intentional:

- If one or more active `usePaste` listeners exist, paste goes to `usePaste`
- Otherwise, paste falls back to `useInput`

In raw-buffer mode, bracketed paste requires `new TerminalGuard(true)`.

---

## Scrolling content moves sibling UI unexpectedly

If you use negative margins to "scroll" a child, Yoga shifts layout instead of clipping.

Use data slicing instead:

```tsx
const visible = items.slice(scroll.offset, scroll.offset + viewportHeight)
```

---

## Text wraps unexpectedly

Text currently wraps to available layout width. There is no `Text wrap="..."` API in Ratatat.

If output looks wrong, check parent width constraints (`Box width`, `padding`, `border`, etc.).

---

## Wide Unicode/emoji alignment issues

Ratatat uses width-aware rendering for full-width characters (for example CJK and many emoji) and marks continuation cells explicitly in the buffer/diff pipeline.

If alignment still looks off, it's usually due to terminal-specific grapheme behavior (for example some ZWJ emoji clusters). For strict layout-sensitive UIs, prefer single-codepoint glyphs over complex emoji sequences.

---

## `renderToString` output surprises

`renderToString` is synchronous and returns a plain string snapshot.

- `useLayoutEffect` updates can affect output
- `useEffect` async follow-up updates do not affect returned output

---

## Still stuck?

- Check [Architecture Decisions](decisions.md)
- Check [Render Loop](render-loop.md)
- Open an issue on [GitHub](https://github.com/geoffmiller/ratatat)
