export type Runtime = "node" | "deno" | "bun" | "browser" | "unknown"

export function getRuntime(): Runtime {
    const g = globalThis as any

    if (typeof g.Deno !== "undefined") {
        return "deno"
    }

    if (typeof g.Bun !== "undefined") {
        return "bun"
    }

    if (typeof g.process !== "undefined" && g.process.versions?.node) {
        return "node"
    }
    if (typeof g.window !== "undefined" || typeof g.self !== "undefined") {
        return "browser"
    }

    return "unknown"
}