
import { expect, test, describe } from "bun:test";
import { Command, parseCommand, ParseCommandError, RunMode } from "./index";

describe("Final Parser Logic Validation", () => {

    test("should throw error if a flag is missing its required argument at the end", async () => {
        const root = new Command({
            name: "app",
            prepare(flags) {
                flags.string({ name: "config", short: "c" });
                return () => { };
            }
        });

        // 測試單獨的長標誌
        expect(parseCommand(["--config"], root)).rejects.toThrow(/flag needs an argument/);

        // 測試短標誌連寫但在末尾需要參數
        expect(parseCommand(["-c"], root)).rejects.toThrow(/flag needs an argument/);
    });

    test("should support opts.all to execute full command chain", async () => {
        const trace: string[] = [];
        const root = new Command({
            name: "root",
            prepare: () => () => { trace.push("root"); return 1; }
        });
        const child = new Command({
            name: "child",
            prepare: () => () => { trace.push("child"); return 2; }
        });
        root.add(child);

        // 當 all 為 true
        const resultAll = await parseCommand(["child"], root, { mode: RunMode.all });
        expect(trace).toEqual(["root", "child"]);
        expect(resultAll.values).toEqual([1, 2]);

        // 當 all 為 false (預設)
        trace.length = 0;
        const resultSingle = await parseCommand(["child"], root);
        expect(trace).toEqual(["child"]);
        expect(resultSingle.values).toEqual([2]);
    });

    test("should handle boolean flag concatenation with help", async () => {
        const root = new Command({
            name: "app",
            prepare(flags) {
                flags.bool({ name: "verbose", short: "v" });
                return () => { throw new Error("Should not run"); };
            }
        });

        // 測試 -vh (v 是 bool, h 是 help)
        const result = await parseCommand(["-vh"], root);
        expect(result.help).toBe(true);
    });

    test("should handle mixed flags and positional arguments correctly", async () => {
        let port = 0;
        let positional: string[] = [];
        const root = new Command({
            name: "app",
            prepare(flags) {
                const p = flags.uint({ name: "port", short: "p" });
                return (args) => {
                    port = p.value!;
                    positional = args;
                };
            }
        });

        // 執行: app -p 8080 cmd-arg1 cmd-arg2
        await parseCommand(["-p", "8080", "cmd-arg1", "cmd-arg2"], root);
        expect(port).toBe(8080);
        expect(positional).toEqual(["cmd-arg1", "cmd-arg2"]);
    });

    test("should not allow unknown flags by default", async () => {
        const root = new Command({ name: "app", prepare: () => () => { } });

        expect(parseCommand(["--unknown"], root)).rejects.toBeInstanceOf(ParseCommandError);
    });

    test("should allow unknown flags when opts.allowUnknowFlag is true", async () => {
        const root = new Command({ name: "app", prepare: () => () => { } });

        const result = await parseCommand(["--unknown"], root, { allowUnknowFlag: true });
        expect(result.values ? true : false).toBe(true);
    });
});
