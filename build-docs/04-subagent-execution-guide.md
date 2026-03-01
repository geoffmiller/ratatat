# Ratatat: Sub-Agent Execution Guide

## Introduction

You are a sub-agent tasked with implementing a specific module of the **Ratatat** Node.js TUI library. Your overarching orchestrator has designed the architecture. Your job is to execute the implementation flawlessly.

## Strict Rules of Engagement

1. **Adhere to the Architecture:** Read `01-architecture-overview.md` and `02-memory-and-data-structures.md` BEFORE writing any code. You must not deviate from the core design.
2. **Context Matters:** You have access to the source code of both `ink` and `ratatui` in the workspace root.
   - Use `ink` as a reference for the ideal Developer Experience (DX) and React Reconciler API.
   - Use `ratatui` as a reference for handling low-level terminal quirks, ANSI sequences, and diffing logic in Rust.
3. **Write Code in `/ratatat`:** All your implementation must exist within the `/ratatat` directory. Do not modify the original `ink` or `ratatui` reference folders.
4. **Performance is King:**
   - In Rust: Zero allocations during the render loop.
   - In JS: No garbage creation (no objects or strings) inside the reconciliation update loop. Use the `Cell.pack` bitmask.

## Execution Workflow

When you are assigned a Task/Milestone from `03-implementation-milestones.md`:

1. **Understand your boundary:** Are you working in Rust (N-API) or TypeScript (React)?
2. **Write the code:** Implement the feature.
3. **Write the tests:** Prove the performance and correctness of your module.
4. **Report Back:** Summarize your changes, any roadblocks encountered, and confirm you have not violated the Memory & Data Structures protocol.
