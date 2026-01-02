# @own-ts/command

A lightweight, high-performance, and strictly typed command-line framework for
TypeScript. Heavily inspired by Go's **Cobra**, but redesigned to leverage the
full power of the TypeScript ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-success)

## ✨ Key Features

- **Strict Type Inference**: Native support for `int`, `uint`, `bigint`,
  `number`, `bool`, and their array counterparts.
- **Flexible Execution Modes**: Choose between `last` (standard), `all`
  (middleware-style), or `runner` (manual control).
- **Closure-Based Handlers**: Define your logic directly inside `prepare` to
  access parsed flags with zero boilerplate.
- **Cobra-Inspired Hierarchy**: Build deeply nested subcommand trees with ease.
- **Async Verification**: First-class support for
  `verify: (v) => void | Promise<void>` for pre-execution validation.
- **Automatic Help**: Every command and subcommand automatically inherits `-h`
  and `--help` flags.

---

## 🚀 Installation

```bash
# Using Bun
bun add @own-ts/command

# Using NPM
npm install @own-ts/command
```

---

## 💻 Example Usage: Subcommands

By defining the handler inside `prepare`, you can use the flag objects directly.
TypeScript automatically infers the correct type for `.value`.

```typescript
import { Command, parseCommand, ParseCommandError } from "@own-ts/command";

const root = new Command({
    name: "my-app",
    usage: "A type-safe CLI example",
    prepare(flags) {
        const debug = flags.bool({
            name: "debug",
            short: "d",
            usage: "enable verbose logging",
        });
        return (args) => console.log(`Root executed. Debug: ${debug.value}`);
    },
});

// Adding a subcommand
root.add(
    new Command({
        name: "greet",
        usage: "greet a user",
        prepare(flags) {
            const name = flags.string({
                name: "name",
                short: "n",
                default: "Guest",
            });
            return (args) => console.log(`Hello, ${name.value}!`);
        },
    }),
);

try {
    // Basic execution (RunMode.last by default)
    await parseCommand(process.argv.slice(2), root);
} catch (e) {
    if (e instanceof ParseCommandError) {
        console.error(e.message);
    }
}
```

---

## ⚙️ Advanced Execution: `RunMode.all`

`RunMode.all` allows you to build a **pipeline of responsibility**. The parent
command handles global setup (like authentication), and the child command
performs the specific task. All handlers in the path are executed sequentially.

```typescript
import { Command, parseCommand, RunMode } from "@own-ts/command";

// 1. Parent command handles global context (e.g., Auth)
const root = new Command({
    name: "cloud",
    prepare(flags) {
        const token = flags.string({ name: "token", usage: "API Token" });

        return async (args, userdata) => {
            if (!token.value) throw new Error("Auth required! Use --token");
            console.log("--- Step 1: Global Authentication Success ---");
            userdata.token = token.value;
            return { api: "connected", token: token.value };
        };
    },
});

// 2. Subcommand handles specific business logic
root.add(
    new Command({
        name: "deploy",
        prepare(flags) {
            const env = flags.string({ name: "env", default: "prod" });

            return async (args, userdata) => {
                console.log(
                    `--- Step 2: Deploying to [${env.value}] use [${userdata.token}] ---`,
                );
                return "Deployment Success";
            };
        },
    }),
);

// Execution: cloud --token secret-key deploy --env staging
const result = await parseCommand(
    ["--token", "key", "deploy", "--env", "staging"],
    root,
    {
        mode: RunMode.all,
        userdata: {},
    },
);

// result.values will contain results from all handlers:
// [ { api: 'connected', ... }, "Deployment Success" ]
```

---

## ⚙️ Run Modes Summary

| Mode                     | Behavior                                                | Use Case                                         |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------ |
| `RunMode.last` (Default) | Executes **only** the deepest matched subcommand.       | Standard CLI behavior (e.g., `git commit`).      |
| `RunMode.all`            | Executes **every** handler from Root to Leaf.           | Middleware-style setup or hierarchical tasks.    |
| `RunMode.runner`         | Returns `Runner[]` contexts **without** executing them. | Manual flow control, parallel execution, or AOP. |

---

## 📖 Automatic Help Generation

You don't need to manually define help flags. **All commands automatically
inherit `-h` and `--help`.**

```text
$ my-app greet --help
greet a user

Usage:
  my-app greet [flags]

Flags:
  -h, --help bool      help for greet
  -n, --name string    name to greet (default "Guest")

Use "my-app [command] --help" for more information about a command.
```

---

## 📊 Supported Flag Types

Every flag method returns an object where `.value` is already cast to the
correct type.

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
        // Perform DB checks, file system lookups, etc.
    },
});
```

---

## ⚖️ License

MIT © powerpuffpenguin
