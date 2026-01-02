# @own-ts/command

A lightweight, high-performance, and strictly typed command-line framework for TypeScript. Heavily inspired by Go's **Cobra**, but redesigned to leverage the full power of the TypeScript ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-success)

## ✨ Key Features

- **Strict Type Inference**: Native support for `int`, `uint`, `bigint`, `number`, `bool`, and their array counterparts.
- **Closure-Based Handlers**: Define your logic directly inside `prepare` to access parsed flags with zero boilerplate.
- **Cobra-Inspired Hierarchy**: Build deeply nested subcommand trees with ease.
- **Async Verification**: First-class support for `verify: (v) => void | Promise<void>` for pre-execution validation.
- **Automatic Help**: Every command and subcommand automatically inherits `-h` and `--help` flags.

---

## 🚀 Installation

```bash
# Using Bun
bun add @own-ts/command

# Using NPM
npm install @own-ts/command

```

---

## 💻 Example Usage

By defining the handler inside `prepare`, you can use the flag objects directly. TypeScript automatically infers the correct type for `.value`.

```typescript
import { Command, parseCommand, ParseCommandError } from '@own-ts/command';

async function main() {
    const root = new Command({
        name: 'my-app',
        usage: 'A type-safe CLI example',
        prepare(flags) {
            const port = flags.uint({
                name: 'port',
                short: 'p',
                default: 8080,
                usage: 'port to listen on',
            });

            const debug = flags.bool({
                name: 'debug',
                short: 'd',
                usage: 'enable verbose logging',
            });

            return async (args) => {
                console.log(`Starting server on port ${port.value}...`);
            };
        }
    });

    root.add({
        name: 'greet',
        usage: 'greet a user',
        prepare(flags) {
            const name = flags.string({ name: 'name', short: 'n', default: 'Guest' });
            return (args) => console.log(`Hello, ${name.value}!`);
        }
    });

    try {
        await parseCommand(Bun.argv.slice(2), root);
    } catch (e) {
        if (e instanceof ParseCommandError) {
            console.log(`${e}`);
        } else {
            console.error('Runtime Error:', e);
        }
    }
}

main();

```

---

## 📖 Automatic Help Generation

You don't need to manually define help flags. **All commands and subcommands are automatically injected with `-h` and `--help`.** When a user requests help, the library generates a professionally aligned output including command hierarchy, available flags, data types, and default values.

### Example Output

```text
$ bun run example.ts -h
A type-safe CLI example

Usage:
  my-app [flags]
  my-app [command]

Available Commands:
  greet    greet a user

Flags:
  -h, --help bool       help for my-app
  -d, --debug bool      enable verbose logging
  -p, --port uint       port to listen on (default 8080)

Use "my-app [command] --help" for more information about a command.

```

---

## 📊 Supported Flag Types

Every flag method returns an object where `.value` is already cast to the correct type.

| Method | Result `.value` Type | Description |
| --- | --- | --- |
| `flags.string` / `strings` | `string` / `string[]` | Standard text input |
| `flags.int` / `ints` | `number` / `number[]` | Signed integers |
| `flags.uint` / `uints` | `number` / `number[]` | Non-negative integers |
| `flags.number` / `numbers` | `number` / `number[]` | Floating point numbers |
| `flags.bigint` / `bigints` | `bigint` / `bigint[]` | High-precision integers |
| `flags.bool` / `bools` | `boolean` / `boolean[]` | Boolean switches |

---

## 🛠 Advanced Verification

The `verify` hook allows you to perform custom logic (even async) during the parsing phase.

```typescript
flags.uint({
    name: 'id',
    verify: async (v) => {
        if (v === 0) throw new Error("ID cannot be zero");
        // Perform async DB checks, file system lookups, etc.
    }
});

```

---

## ⚖️ License

MIT © powerpuffpenguin

