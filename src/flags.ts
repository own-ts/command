import { CommandError } from "./errors";
import {
    Flag, type FlagOptions,
    FlagString, FlagStrings,
    FlagNumber, FlagNumbers,
    FlagInt, FlagInts,
    FlagBigint, FlagBigints,
    FlagBoolean, FlagBooleans,
    FlagUint, FlagUints
} from "./flag";
import { compareString, getLevenshteinDistance } from "./strings";
export type CommandCallback<T = any> = (args: string[], userdata: any, cmd: ICommand) => T | Promise<T>
export interface ICommand {
    /**
     * parent command
     */
    parent?: ICommand | undefined | null

    /**
     * command name
     */
    readonly name: string

    /**
     * Describe the usage of this command
     */
    readonly usage?: string

    /**
     * Describe the detailed usage of this command
     */
    readonly usageLong: string | (() => string)

    /**
     * command flags
     */
    readonly flags: Flags

    /**
     * Return command string
     */
    use(): string

    /**
     * command callback
     */
    run: CommandCallback | null | undefined

    /**
     * found subcommand
     */
    child(name: string): ICommand | null
    /**
     * Returns whether a subcommand exists.
     */
    hasChildren(): boolean

    /**
     * guess the subcommand the user wants to use
     */
    guess(name: string, levenshteinDistance?: number | null): ICommand | null

    toString(err?: boolean): string

    /**
     * return subcommand
     */
    values(): MapIterator<ICommand>
}
/**
 * Flags definition and parse
 */
export class Flags implements Iterable<Flag<any>> {
    constructor(
        private readonly cmd: ICommand,
    ) { }
    /**
     * @internal
     */
    get use(): string {
        const cmd = this.cmd
        const strs = [cmd.name]
        for (let parent = cmd.parent; parent; parent = parent.parent) {
            strs.push()
            strs.push(parent.name)
        }
        return strs.reverse().join(' ')
    }
    private short_?: Map<string, Flag<any>>
    private long_?: Map<string, Flag<any>>
    private arrs_?: Array<Flag<any>>
    /**
     * @internal
     */
    find(name: string, short = false): Flag<any> | undefined {
        return short ? this.short_?.get(name) : this.long_?.get(name);
    }
    guess(name: string, levenshteinDistance?: number | null): Flag<any, any> | null {
        if (!this.long_) {
            return null
        }
        let found = Number.isFinite(levenshteinDistance) ? levenshteinDistance! : 2
        let v: Flag<any, any> | null = null
        if (found > 0) {
            let i
            for (const [key, flag] of this.long_) {
                i = getLevenshteinDistance(name, key)
                if (i <= found) {
                    found = i
                    v = flag
                }
            }
        }
        return v
    }
    private _getArrs(): undefined | Array<Flag<any>> {
        const keys = this.long_
        if (!keys) {
            return
        }
        let arrs = this.arrs_
        if (!arrs || arrs.length != keys.size) {
            arrs = []
            for (const f of keys.values()) {
                arrs.push(f)
            }
            arrs.sort((l, r) => compareString(l.name, r.name))
        }
        return arrs
    }
    /**
     * @internal
     */
    iterator(): Iterator<Flag<any>, undefined> {
        const arrs = this._getArrs()
        let i = 0
        return {
            next() {
                if (arrs && i < arrs.length) {
                    return { value: arrs[i++]! }
                }
                return { done: true }
            },
        };
    }
    [Symbol.iterator](): Iterator<Flag<any>> {
        return this.iterator()
    }

    /**
     * @internal
     */
    reset() {
        this.long_?.forEach((f) => {
            f.reset()
        })
    }
    /**
     * Define flags
     */
    add(...flags: Array<Flag<any>>) {
        if (flags.length == 0) {
            return;
        }
        let kl = this.long_
        if (!kl) {
            kl = new Map<string, Flag<any>>()
            this.long_ = kl
        }
        let ks = this.short_
        if (!ks) {
            ks = new Map<string, Flag<any>>()
            this.short_ = ks
        }
        for (const f of flags) {
            const name = f.name

            if (kl.has(name)) {
                throw new CommandError(`${this.use} flag redefined: ${name}`)
            }
            const short = f.short
            if (short !== "") {
                const found = ks.get(short)
                if (found) {
                    throw new CommandError(
                        `unable to redefine '${short}' shorthand in "${this.use}" flagset: it's already used for "${found.name}" flag`,
                    )
                }
                ks.set(short, f)
            }
            kl.set(name, f)
        }
    }
    /**
     * Define a flag of type string
     */
    string(opts: FlagOptions<string>): FlagString {
        const f = new FlagString(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type string[]
     */
    strings(opts: FlagOptions<string[], string>): FlagStrings {
        const f = new FlagStrings(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type number
     */
    number(opts: FlagOptions<number>): FlagNumber {
        const f = new FlagNumber(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type number[]
     */
    numbers(opts: FlagOptions<number[], number>): FlagNumbers {
        const f = new FlagNumbers(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type int
     */
    int(opts: FlagOptions<number>): FlagInt {
        const f = new FlagInt(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type int[]
     */
    ints(opts: FlagOptions<number[], number>): FlagInts {
        const f = new FlagInts(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type uint
     */
    uint(opts: FlagOptions<number>): FlagUint {
        const f = new FlagUint(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type uint[]
     */
    uints(opts: FlagOptions<number[], number>): FlagUints {
        const f = new FlagUints(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type bigint
     */
    bigint(opts: FlagOptions<bigint>): FlagBigint {
        const f = new FlagBigint(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type Array<bigint>
     */
    bigints(opts: FlagOptions<bigint[], bigint>): FlagBigints {
        const f = new FlagBigints(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type boolean
     */
    bool(opts: FlagOptions<boolean>): FlagBoolean {
        const f = new FlagBoolean(opts)
        this.add(f)
        return f
    }
    /**
     * Define a flag of type Array<boolean>
     */
    bools(opts: FlagOptions<boolean[], boolean>): FlagBooleans {
        const f = new FlagBooleans(opts)
        this.add(f)
        return f
    }
}