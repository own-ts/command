
import { expect, test, describe } from "bun:test";
import { Command, parseCommand } from "./index";

describe("Subcommand Flag Overriding and Isolation", () => {

    test("should isolate same-named flags and handle potential nulls", async () => {
        // 初始化為 undefined 或 null 以模擬真實狀態
        let rootVal: string | null = undefined as any;
        let childVal: number | null = undefined as any;

        const root = new Command({
            name: "root",
            prepare(flags) {
                // 不給 default，這可能為 null
                const config = flags.string({ name: "config", short: "c" });

                return () => {
                    rootVal = config.value;
                };
            }
        });

        root.add({
            name: "child",
            prepare(flags) {
                const config = flags.int({ name: "config", short: "c" });

                return () => {
                    childVal = config.value;
                };
            }
        });

        // 情況 A: 都有輸入
        await parseCommand(["--config", "parent.yaml", "child", "--config", "99"], root);
        expect(rootVal).toBe("parent.yaml");
        expect(childVal).toBe(99);

        // 情況 B: 子命令未輸入 Flag (驗證 null 隔離)
        await parseCommand(["--config", "new.yaml", "child"], root);
        expect(rootVal).toBe("new.yaml");
        expect(childVal).toBeNull(); // 這裡驗證了它正確返回 null 而非繼承父命令的值
    });

    test("should respect independent nullability between parent and child", async () => {
        let rootPort: number | null = 0;
        let childPort: number | null = 0;

        const root = new Command({
            name: "app",
            prepare(flags) {
                const port = flags.int({ name: "port" }); // 無 default
                return () => { rootPort = port.value; };
            }
        });

        root.add({
            name: "server",
            prepare(flags) {
                const port = flags.int({ name: "port", default: 8080 });
                return () => { childPort = port.value; };
            }
        });

        // 當都不輸入 --port 時
        await parseCommand(["server"], root);

        expect(rootPort).toBeNull();    // 父命令沒有預設值，應為 null
        expect(childPort).toBe(8080);   // 子命令有預設值，應為 8080
    });

    test("should handle deep nested flags and their null states", async () => {
        let leafValue: string | null = "initial";

        const root = new Command({ name: "root", prepare: () => () => { } });
        const level1 = new Command({ name: "level1", prepare: () => () => { } });
        const level2 = new Command({
            name: "level2",
            prepare: (flags) => {
                const f = flags.string({ name: "flag" }); // 無 default
                return () => { leafValue = f.value; };
            }
        });

        root.add(level1);
        level1.add(level2);

        // 執行但不傳 flag
        await parseCommand(["level1", "level2"], root);
        expect(leafValue).toBeNull();

        // 執行並傳 flag
        await parseCommand(["level1", "level2", "--flag", "hello"], root);
        expect(leafValue).toBe("hello");
    });

    test("should strictly isolate flags within their own scope", async () => {
        const root = new Command({
            name: "app",
            prepare(flags) {
                flags.bool({ name: "global" });
                return () => { };
            }
        });

        root.add({
            name: "run",
            prepare: (flags) => {
                const local = flags.bool({ name: "local" });
                return () => {
                    expect(local.value).toBe(true);
                };
            }
        });

        // 正常執行
        await parseCommand(["run", "--local"], root);

        // 異常執行：子命令嘗試使用父命令的 flag (不具備繼承性)
        // 在你的架構中，如果 run 沒有定義 global，這應該報錯
        expect(parseCommand(["run", "--global"], root)).rejects.toThrow();
    });
});
