# @own-ts/command

A lightweight, high-performance, and strictly typed command-line framework for
TypeScript. Heavily inspired by Go's **Cobra**, but redesigned to leverage the
full power of the TypeScript ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-success)

## ✨ Key Features

- **Strict Type Inference**: Native support for `int`, `uint`, `bigint`,
  `number`, `bool`, and their array counterparts.
- **Closure-Based Handlers**: Define your logic directly inside `prepare` to
  access parsed flags with zero boilerplate.
- **Cobra-Inspired Hierarchy**: Build deeply nested subcommand trees (e.g.,
  `app service user add`).
- **Async Verification**: First-class support for
  `verify: (v) => void | Promise<void>` for pre-execution validation.
- **Zero Dependencies**: Lightning-fast startup. Perfect for Bun, Deno, and
  Node.js.

---

```
$ bun run example.ts -h
A type-safe CLI example

Usage:
  my-app [flags]
  my-app [command]

Available Commands:
  greet   greet a user

Flags:
  -h, --help bool       help for my-app
  -d, --debug bool      enable verbose logging
  -p, --port uint       port to listen on (default 8080)

Use "my-app [command] --help" for more information about a command.
```

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

By defining the handler inside `prepare`, you can use the flag objects directly.
TypeScript automatically infers the correct type for `.value` (e.g., `number`
for `int`, `boolean` for `bool`).

```typescript
import { Command, parseCommand, ParseCommandError } from "@own-ts/command";

async function main() {
    const root = new Command({
        name: "my-app",
        usage: "A type-safe CLI example",
        prepare(flags) {
            // Define flags
            const port = flags.uint({
                name: "port",
                short: "p",
                default: 8080,
                usage: "port to listen on",
            });

            const debug = flags.bool({
                name: "debug",
                short: "d",
                usage: "enable verbose logging",
            });

            // Return the handler directly
            // 'port.value' is inferred as 'number'
            // 'debug.value' is inferred as 'boolean'
            return async (args) => {
                if (debug.value) {
                    console.log(
                        `Starting server in debug mode on port ${port.value}...`,
                    );
                } else {
                    console.log(`Starting server on port ${port.value}...`);
                }
                console.log("Extra arguments:", args);
            };
        },
    });

    // Add a Subcommand
    root.add({
        name: "greet",
        usage: "greet a user",
        prepare(flags) {
            const name = flags.string({
                name: "name",
                short: "n",
                default: "Guest",
                usage: "user to greet",
            });

            return (args) => {
                console.log(`Hello, ${name.value}!`);
            };
        },
    });

    // Parse and Execute
    try {
        await parseCommand(Bun.argv.slice(2), root);
    } catch (e) {
        if (e instanceof ParseCommandError) {
            // Automatically handles usage printing on errors
            console.log(`${e}`);
        } else {
            console.error("Runtime Error:", e);
        }
    }
}

main();
```

---

## 📊 Supported Flag Types

Every flag method returns an object with a `.value` property of the
corresponding type.

| Method                     | Result `.value` Type    | Description             |
| -------------------------- | ----------------------- | ----------------------- |
| `flags.string` / `strings` | `string` / `string[]`   | Standard text input     |
| `flags.int` / `ints`       | `number` / `number[]`   | Signed integers         |
| `flags.uint` / `uints`     | `number` / `number[]`   | Non-negative integers   |
| `flags.number` / `numbers` | `number` / `number[]`   | Floating point numbers  |
| `flags.bigint` / `bigints` | `bigint` / `bigint[]`   | High-precision integers |
| `flags.bool` / `bools`     | `boolean` / `boolean[]` | Boolean switches        |

---

## 🛠 Advanced Verification

The `verify` hook allows you to perform custom logic (even async) during the
parsing phase.

```typescript
flags.uint({
    name: "id",
    verify: async (v) => {
        if (v === 0) throw new Error("ID cannot be zero");
        // You could also check a database here
    },
});
```

---

## ⚖️ License

MIT © powerpuffpenguin
