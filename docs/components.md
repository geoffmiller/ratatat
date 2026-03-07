# Components

Ratatat implements all Ink-compatible components plus a few Ratatat-only additions.

---

## Box

The layout primitive. Maps directly to Yoga flexbox.

```tsx
<Box
  flexDirection="column" // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  flexGrow={1}
  flexShrink={0}
  flexBasis="auto"
  width={40}
  height={10}
  minWidth={10}
  minHeight={4}
  padding={1}
  paddingX={2}
  paddingY={1}
  paddingTop={0}
  paddingBottom={0}
  paddingLeft={1}
  paddingRight={1}
  margin={1}
  marginX={2}
  marginY={0}
  marginTop={0}
  marginBottom={0}
  marginLeft={1}
  marginRight={1}
  gap={1}
  columnGap={2}
  rowGap={1}
  alignItems="flex-start" // 'flex-start' | 'flex-end' | 'center' | 'stretch'
  alignSelf="auto"
  alignContent="flex-start"
  justifyContent="flex-start" // 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around'
  flexWrap="nowrap" // 'nowrap' | 'wrap' | 'wrap-reverse'
  borderStyle="single" // 'single' | 'double' | 'round' | 'bold' | 'arrow' | 'classic'
  borderColor="cyan"
  borderTopColor="red"
  borderBottomColor="blue"
  borderLeftColor="green"
  borderRightColor="yellow"
  borderTop={true}
  borderBottom={false}
  borderLeft={true}
  borderRight={true}
  overflow="hidden" // 'visible' | 'hidden'
>
  {children}
</Box>
```

---

## Text

Renders styled text.

```tsx
<Text
  color="cyan" // named color, hex '#rrggbb', rgb(r,g,b), or xterm 256 index
  backgroundColor="blue"
  bold={true}
  italic={true}
  underline={true}
  strikethrough={true}
  dim={true}
  dimColor={true} // alias for dim (Ink compat)
  inverse={true}
  wrap="wrap" // 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle'
>
  Hello world
</Text>
```

Colors can be expressed as:

- Named: `red`, `green`, `blue`, `cyan`, `magenta`, `yellow`, `white`, `black`, `gray`, `grey`
- Hex: `#ff6600`
- RGB: `rgb(255, 100, 0)`
- xterm 256: integer `0–255`

---

## Newline

Renders one or more blank lines.

```tsx
<Newline />         // one line
<Newline count={2} />
```

---

## Spacer

Flexible spacer — fills all remaining space in a flex container.

```tsx
<Box flexDirection="row">
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

---

## Static

Append-only scrollback region. Ideal for streaming output: logs, task results, chat history.

Previously-rendered items are frozen — they are never re-rendered or cleared. New items appear above the dynamic UI.

```tsx
import { Static } from 'ratatat'

;<Static items={completedTasks}>
  {(task, i) => (
    <Box key={i}>
      <Text color="green">✓ {task.name}</Text>
    </Box>
  )}
</Static>
```

`items` is an array. Pass a new item by appending to the array — Static detects the new tail and renders only the new entries.

---

## Transform

Applies a string transformation to all text output from its children.

```tsx
import { Transform } from 'ratatat'

;<Transform transform={(s) => s.toUpperCase()}>
  <Text>hello world</Text> {/* renders as: HELLO WORLD */}
</Transform>
```

The `transform` function receives the concatenated text of all children and returns the modified string. Can be used for color injection, text replacement, etc.

---

## Spinner

Animated single-character spinner.

```tsx
import { Spinner } from 'ratatat'

<Spinner />                                    // default Braille animation, 80ms
<Spinner color="cyan" />                       // with Text color prop
<Spinner frames={['-', '\\', '|', '/']} interval={100} />  // custom frames
```

Props (in addition to all `Text` props):

| Prop       | Type       | Default        | Description                        |
| ---------- | ---------- | -------------- | ---------------------------------- |
| `frames`   | `string[]` | Braille frames | Array of animation frame strings   |
| `interval` | `number`   | `80`           | Milliseconds between frame updates |

---

## ProgressBar

Terminal progress bar with optional percentage label.

```tsx
import { ProgressBar } from 'ratatat'

<ProgressBar value={42} />                     // [████████░░░░░░░░░░░░] 42%
<ProgressBar value={downloaded} max={total} width={30} color="green" />
<ProgressBar value={50} showPercentage={false} />   // [██████████░░░░░░░░░░]
<ProgressBar value={3} max={10} completeChar="=" incompleteChar="-" bracket={false} />
```

Props (in addition to all `Text` props):

| Prop             | Type      | Default  | Description                      |
| ---------------- | --------- | -------- | -------------------------------- |
| `value`          | `number`  | required | Current value                    |
| `max`            | `number`  | `100`    | Maximum value                    |
| `width`          | `number`  | `20`     | Number of cells for the bar body |
| `completeChar`   | `string`  | `'█'`    | Filled segment character         |
| `incompleteChar` | `string`  | `'░'`    | Empty segment character          |
| `bracket`        | `boolean` | `true`   | Wrap bar with `[` `]`            |
| `showPercentage` | `boolean` | `true`   | Render `N%` after bar            |
