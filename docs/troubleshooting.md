# Troubleshooting

---

## "Device not configured" (os error 6)

**Cause:** The app started but there is no real TTY attached to stdin. This happens when you run the binary from a non-interactive context — piped stdin, redirected output, CI without a PTY, or backgrounded with `& > logfile`.

**Fix:** Run in a real terminal (Terminal.app, iTerm, Ghostty, etc.) with a TTY attached:

```bash
# OK
./my-app

# Will fail
./my-app > output.log
echo "" | ./my-app
```

---

## Terminal left in raw mode after crash

**Cause:** The app crashed or was killed before `TerminalGuard.leave()` ran.

**Fix:** Type `reset` or `stty sane` in the same terminal window, then press Enter (even if you can't see what you're typing):

```bash
reset
# or
stty sane
```

Ratatat's `TerminalGuard` uses Rust RAII drop semantics — it will restore the terminal even on panic. But if the Node process was hard-killed (`kill -9`, OOM), the drop handler does not fire.

---

## Blank screen / no output

**Cause:** Several possible causes:

1. **App is running but rendering nothing** — check that your root component returns something visible.
2. **Alternate screen is active but nothing painted yet** — the first paint runs immediately on `render()`. If you see a blank alternate screen, your component may be returning `null`.
3. **Terminal emulator doesn't support alternate screen** — try a different terminal.

---

## Input not responding

**Cause:** stdin is not in raw mode, or the input parser has not started.

**Checks:**

- Are you using `render()` (which calls `input.start()` automatically)?
- Are you in a real TTY? (`process.stdin.isTTY` should be `true`)
- For raw-buffer mode: did you create a `TerminalGuard` before starting your loop?

---

## Mouse events not firing

**Cause:** Mouse tracking not enabled.

**Fix:** Pass `true` to `TerminalGuard`:

```ts
const guard = new TerminalGuard(true) // enables SGR 1006 mouse tracking
```

In React mode, this is enabled by default (the app calls `new TerminalGuard(true)` internally).

If events still don't fire, verify your terminal emulator supports SGR mouse tracking. Most modern terminals do (Terminal.app, iTerm2, Ghostty, kitty, alacritty).

---

## Paste events not firing / paste goes to useInput instead

**Cause:** Bracketed paste mode not enabled, or no active `usePaste` listener.

**Fix — bracketed paste not enabled:** In React mode, bracketed paste is enabled automatically. In raw-buffer mode, pass `true` to `TerminalGuard`:

```ts
const guard = new TerminalGuard(true)
```

**Fix — paste goes to useInput:** This is intentional when no `usePaste` listener is active. Pasted text falls back to `useInput` as regular characters. Add a `usePaste` listener to intercept it:

```tsx
usePaste((text) => {
  console.log('pasted:', text)
})
```

---

## Text wrapping / layout looks wrong

**Cause:** Box dimensions not constrained, or `wrap` prop not set.

**Fix:** Ensure your root `Box` has a fixed or constrained width:

```tsx
const { columns } = useWindowSize()
<Box width={columns} flexDirection="column">
  ...
</Box>
```

For `Text`, set the `wrap` prop explicitly when you need controlled wrapping:

```tsx
<Text wrap="wrap">long text that should wrap</Text>
<Text wrap="truncate">text that should truncate at the edge</Text>
```

---

## Emoji or Unicode renders as two cells

**Cause:** Wide characters (full-width CJK, emoji) occupy two terminal columns but Ratatat's layout may not account for display width vs codepoint count in all cases.

**Workaround:** Treat wide characters as 2 columns wide in your layout math. Most Latin-script terminal apps are unaffected.

---

## `@oxc-node/core/register` not found

**Cause:** `@oxc-node/core` is not installed or the register path changed.

**Fix:**

```bash
npm install -D @oxc-node/core
```

Alternatively, compile with `tsc` first and run the compiled `.js` output:

```bash
npm run build:ts
node dist/examples/counter.js
```

---

## Blank output from renderToString

**Cause:** `renderToString` renders synchronously. `useEffect` callbacks run but state updates they trigger do not affect the output. `useLayoutEffect` callbacks do fire and affect output.

**Fix:** Move initial state setup to `useLayoutEffect` or directly into the component body, not `useEffect`.

---

## SEA binary fails on macOS ("cannot be opened because the developer cannot be verified")

**Cause:** The binary is ad-hoc signed but not Apple-notarized.

**Fix:**

```bash
# Option 1: allow via System Preferences → Privacy & Security
# Option 2: remove the quarantine attribute
xattr -d com.apple.quarantine ./ratatat-kitchen-sink
```

---

## Still stuck?

Check the [Architecture Decisions](decisions.md) for insight into how things work internally, or open an issue on [GitHub](https://github.com/geoffmiller/ratatat).
