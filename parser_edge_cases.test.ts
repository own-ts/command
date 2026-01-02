
import { expect, test, describe } from "bun:test";
import { Command, parseCommand } from "./index";

describe("Parser Edge Cases & Complex Flags", () => {

    test("should handle --flag=value format", async () => {
        let port = 0;
        let name = "";
        const root = new Command({
            name: "app",
            prepare(flags) {
                const p = flags.uint({ name: "port" });
                const n = flags.string({ name: "name" });
                return () => {
                    port = p.value!;
                    name = n.value!;
                };
            }
        });

        // 測試等號賦值
        await parseCommand(["--port=3000", "--name=service-a"], root);
        expect(port).toBe(3000);
        expect(name).toBe("service-a");

        // 測試等號後為空字符串 (應解析為空字串而非 null)
        await parseCommand(["--name="], root);
        expect(name).toBe("");
    });

    test("should handle shorthand concatenation and value attachment", async () => {
        let debug = false;
        let force = false;
        let port = 0;

        const root = new Command({
            name: "app",
            prepare(flags) {
                const d = flags.bool({ name: "debug", short: "d" });
                const f = flags.bool({ name: "force", short: "f" });
                const p = flags.uint({ name: "port", short: "p" });
                return () => {
                    debug = d.value!;
                    force = f.value!;
                    port = p.value!;
                };
            }
        });

        // 1. 純布爾連寫: -df
        await parseCommand(["-df"], root);
        expect(debug).toBe(true);
        expect(force).toBe(true);

        // 2. 布爾與數值連寫: -dp8080 (p 拿到剩下的部分)
        await parseCommand(["-dp8080"], root);
        expect(debug).toBe(true);
        expect(port).toBe(8080);

        // 3. 短標誌使用等號: -p=9000
        await parseCommand(["-p=9000"], root);
        expect(port).toBe(9000);
    });

    test("should trigger help even when it is the last argument", async () => {
        const root = new Command({
            name: "app",
            prepare(flags) {
                flags.uint({ name: "port", short: "p" });
                return () => console.log("Execution should not reach here if help is triggered");
            }
        });

        // 測試 --help 在最後位置是否能正確 return 而不執行 run()
        const result = await parseCommand(["--port", "80", "--help"], root);
        expect(result.help).toBe(true);
    });

    test("should handle the single dash '-' as a positional argument", async () => {
        let args: string[] = [];
        const root = new Command({
            name: "app",
            prepare: () => (a) => { args = a; }
        });

        // 在 Unix 中 '-' 常用於表示 stdin，不應被當作無效 flag 報錯
        await parseCommand(["-"], root);
        expect(args).toContain("-");
    });

    test("should correctly parse mixed boolean and non-boolean chains", async () => {
        let a = false, b = false, c = "";
        const root = new Command({
            name: "test",
            prepare(flags) {
                const fa = flags.bool({ name: "aa", short: "a" });
                const fb = flags.bool({ name: "bb", short: "b" });
                const fc = flags.string({ name: "cc", short: "c" });
                return () => {
                    a = fa.value!;
                    b = fb.value!;
                    c = fc.value!;
                };
            }
        });

        // 測試 -abcvalue -> a=true, b=true, c="value"
        await parseCommand(["-abcvalue"], root);
        expect(a).toBe(true);
        expect(b).toBe(true);
        expect(c).toBe("value");
    });
});

