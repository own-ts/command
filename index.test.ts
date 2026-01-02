
import { expect, test, describe } from "bun:test";
import { Command, parseCommand, ParseCommandError } from "./index";

describe("Command Parser Validation", () => {

    test("should parse basic flags correctly", async () => {
        let executed = false;
        const root = new Command({
            name: "test",
            prepare(flags) {
                const port = flags.uint({ name: "port", short: "p" });
                const debug = flags.bool({ name: "debug", short: "d" });

                return (args) => {
                    executed = true;
                    expect(port.value).toBe(3000);
                    expect(debug.value).toBe(true);
                    expect(args).toEqual(["extra"]);
                };
            }
        });

        await parseCommand(["-p", "3000", "-d", "extra"], root);
        expect(executed).toBe(true);
    });

    test("should use default values when flags are missing", async () => {
        const root = new Command({
            name: "test",
            prepare(flags) {
                const timeout = flags.int({ name: "timeout", default: 5000 });
                return () => {
                    expect(timeout.value).toBe(5000);
                };
            }
        });

        await parseCommand([], root);
    });

    test("should handle array (ints/strings) flags", async () => {
        const root = new Command({
            name: "test",
            prepare(flags) {
                const ids = flags.ints({ name: "id", short: "i" });
                return () => {
                    expect(ids.value).toEqual([1, 2, 3]);
                };
            }
        });

        await parseCommand(["-i", "1", "-i", "2", "--id", "3"], root);
    });

    test("should trigger async verify and catch errors", async () => {
        const root = new Command({
            name: "test",
            prepare(flags) {
                flags.string({
                    name: "token",
                    verify: async (v) => {
                        if (v.length < 5) throw new Error("Token too short");
                    }
                });
                return () => { };
            }
        });

        // 驗證失敗應拋出 ParseCommandError 或原始 Error
        expect(parseCommand(["--token", "abc"], root)).rejects.toThrow("Token too short");
    });

    test("should route to subcommands and isolate flags", async () => {
        let childExecuted = false;
        const root = new Command({
            name: "root",
            prepare: (flags) => {
                const v = flags.bool({ name: "verbose" });
                return () => { expect(v.value).toBe(true); };
            }
        });

        root.add({
            name: "child",
            prepare: (flags) => {
                const n = flags.int({ name: "num" });
                return () => {
                    childExecuted = true;
                    expect(n.value).toBe(99);
                };
            }
        });

        // 執行: root --verbose child --num 99
        await parseCommand(["--verbose", "child", "--num", "99"], root);
        expect(childExecuted).toBe(true);
    });

    test("should throw error for unknown flags", async () => {
        const root = new Command({
            name: "test",
            prepare: () => () => { }
        });

        expect(parseCommand(["--unknown"], root)).rejects.toBeInstanceOf(ParseCommandError);
    });
});


