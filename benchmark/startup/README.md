# Startup benchmark (Ratatat vs Ink)

Measures **time-to-marker** in a pseudo-terminal (PTY):

- process start
- module loading
- framework init
- first render path
- marker text becomes visible in PTY output

## Run

```bash
npm run build:ts
npm run bench:startup
```

Optional knobs:

```bash
RUNS=40 WARMUP=3 TIMEOUT_MS=8000 npm run bench:startup
```

## Notes

- Uses the system `script` command to create a PTY.
- On macOS/BSD, `script` prepends `^D\b\b`; the harness strips this.
- Marker-based detection is resilient to ANSI escapes/newline splitting.
- Includes a `node baseline` row to show raw process-start overhead.
