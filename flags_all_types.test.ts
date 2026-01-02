import { expect, test, describe } from "bun:test";
import { Command, parseCommand } from "./index";

describe("Comprehensive Flag Types Validation", () => {

    test("should correctly parse all scalar flag types", async () => {
        let results: any = {};

        const root = new Command({
            name: "test",
            prepare(flags) {
                const fInt = flags.int({ name: "int", short: "i" });
                const fUint = flags.uint({ name: "uint", short: "u" });
                const fNumber = flags.number({ name: "number", short: "n" });
                const fBigint = flags.bigint({ name: "bigint", short: "b" });
                const fString = flags.string({ name: "string", short: "s" });
                const fBool = flags.bool({ name: "bool", short: "B" });

                return () => {
                    results = {
                        int: fInt.value,
                        uint: fUint.value,
                        number: fNumber.value,
                        bigint: fBigint.value,
                        string: fString.value,
                        bool: fBool.value,
                    };
                };
            }
        });

        await parseCommand([
            "--int", "-10",
            "--uint", "80",
            "--number", "3.14",
            "--bigint", "9007199254740991",
            "--string", "hello world",
            "--bool"
        ], root);

        expect(results.int).toBe(-10);
        expect(results.uint).toBe(80);
        expect(results.number).toBe(3.14);
        expect(results.bigint).toBe(9007199254740991n); // 驗證 BigInt 
        expect(results.string).toBe("hello world");
        expect(results.bool).toBe(true);
    });

    test("should correctly parse all array flag types", async () => {
        let results: any = {};

        const root = new Command({
            name: "test",
            prepare(flags) {
                const fInts = flags.ints({ name: "ints" });
                const fUints = flags.uints({ name: "uints" });
                const fNumbers = flags.numbers({ name: "numbers" });
                const fBigints = flags.bigints({ name: "bigints" });
                const fStrings = flags.strings({ name: "strings" });
                const fBools = flags.bools({ name: "bools" });

                return () => {
                    results = {
                        ints: fInts.value,
                        uints: fUints.value,
                        numbers: fNumbers.value,
                        bigints: fBigints.value,
                        strings: fStrings.value,
                        bools: fBools.value,
                    };
                };
            }
        });

        await parseCommand([
            "--ints", "-1", "--ints", "2",
            "--uints", "80", "--uints", "443",
            "--numbers", "1.1", "--numbers", "2.2",
            "--bigints", "100", "--bigints", "200",
            "--strings", "a", "--strings", "b",
            "--bools", "--bools"
        ], root);

        expect(results.ints).toEqual([-1, 2]);
        expect(results.uints).toEqual([80, 443]);
        expect(results.numbers).toEqual([1.1, 2.2]);
        expect(results.bigints).toEqual([100n, 200n]);
        expect(results.strings).toEqual(["a", "b"]);
        expect(results.bools).toEqual([true, true]);
    });

    test("should respect default values for all types", async () => {
        const root = new Command({
            name: "test",
            prepare(flags) {
                const dInt = flags.int({ name: "int", default: -1 });
                const dUint = flags.uint({ name: "uint", default: 1 });
                const dBigint = flags.bigint({ name: "bigint", default: 100n });
                const dString = flags.string({ name: "string", default: "def" });
                const dBool = flags.bool({ name: "bool", default: false });

                return () => {
                    expect(dInt.value).toBe(-1);
                    expect(dUint.value).toBe(1);
                    expect(dBigint.value).toBe(100n);
                    expect(dString.value).toBe("def");
                    expect(dBool.value).toBe(false);
                };
            }
        });

        await parseCommand([], root);
    });

    test("should handle negative cases for typed flags", async () => {
        const root = new Command({
            name: "test",
            prepare(flags) {
                flags.uint({ name: "uint" });
                flags.int({ name: "int" });
                return () => { };
            }
        });

        // uint 不應接受負數 (假設你的 uint 實現有此校驗)
        expect(parseCommand(["--uint", "-1"], root)).rejects.toThrow();

        // int 不應接受非數字字符串
        expect(parseCommand(["--int", "not-a-number"], root)).rejects.toThrow();
    });
});

