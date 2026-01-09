import { CommandError } from './errors'
import { formatUsage, getLevenshteinDistance, parseBool } from './strings'
export interface IFlag<T, TV = T> {
    /**
     * Flag name: `--${name}`
     */
    readonly name: string
    /**
     * Shorthand name `-${short}`
     */
    readonly short: string
    /**
     * Default value when not specified by user
     */
    readonly default: T | null
    /**
     * Describe the usage of this flag
     */
    readonly usage: string
    /**
     * Ff set, only these values ​​will be considered valid.
     */
    readonly values: TV[] | null

    /**
     * type name
     */
    readonly type: string
    /**
     * Verify that the flag value is valid
     */
    verify(v: TV): void | Promise<void>
    /**
     * set value to default value
     */
    reset(): void
    /**
     * The value parsed by this flag
     */
    get value(): T | null
    /**
     * Returns a string description of the default value
     */
    defaultString(): string
    /**
     * Returns a string description of the list of valid values
     */
    valuesString(): string
    /**
     * Parsed to this flag
     * @param val The parsed command line value
     */
    parse(s: string): void | Promise<void>
    /**
     * Returns whether it is a bool flag
     */
    isBool(): boolean

    /**
     * Guessing what the user actually wants to input
     */
    guess(v: string, levenshteinDistance?: number | null): string | null
}
export interface FlagOptions<T, TV = T> {
    /**
     * flag long name
     */
    name: string
    /**
     * Optional flag shorthand name
     */
    short?: string | undefined | null
    /**
     * Default value when no flag is specified
     */
    default?: T | undefined | null

    /**
     * Optional flag usage description
     */
    usage?: string | undefined | null
    /**
     * An optional list of valid values for the flag
     * @remarks
     * If isValid is set at the same time, isValid will be called for verification when the values do not match, and if the values match, the value will be considered valid and will not call isValid
     */
    values?: TV[]
    /**
     * Optional parameter validation function
     */
    verify?: (v: TV) => void | Promise<void>
}
/**
 * A base class provides some common methods for the class flag
 */
export class Flag<T, TV = T> implements IFlag<T, TV> {
    protected value_: T | null = null
    get value(): T | null {
        return this.value_ ?? this.default ?? null
    }
    readonly name: string
    readonly short: string
    readonly default: T | null
    readonly usage: string
    readonly values: TV[] | null
    protected readonly verify_?: (v: TV) => void | Promise<void>
    protected _verifyValues(v: TV) {
        const vals = this.values
        if (Array.isArray(vals)) {
            const s = JSON.stringify(v)
            for (const val of vals) {
                if (JSON.stringify(val) === s) {
                    return
                }
            }
            throw new Error('value is not in the list of available values')
        }
    }
    constructor(opts: FlagOptions<T, TV>, readonly type: string) {
        const name = opts.name
        if (typeof name !== 'string') {
            throw new CommandError(
                `Flag name must be a string`,
            )
        } else if (name.indexOf('=') >= 0) {
            throw new CommandError(
                `Flag name cannot contain '='`,
            )
        }
        this.name = name
        const short = opts.short ?? ''
        if (typeof short !== 'string') {
            throw new CommandError(
                `Flag short must be one of string | undefined | null`,
            )
        } else if (short.length > 1) {
            throw new CommandError(
                `Flag short can only be one character`,
            )
        }
        switch (short) {
            case '=':
            case '-':
            case "'":
            case '"':
                throw new CommandError(
                    `Flag short cannot be in [=-'"]`,
                )
        }
        this.short = short
        const def = opts?.default ?? null
        this.default = def
        const usage = opts.usage ?? ''
        if (typeof usage !== 'string') {
            throw new CommandError(
                `Flag usage must be one of string | undefined | null`,
            )
        }
        this.usage = formatUsage(usage)
        const values = opts.values
        if (values && !Array.isArray(values)) {
            throw new CommandError(
                `Flag values must be an Array`,
            )
        }
        this.values = values ?? null

        const verify = opts.verify
        if (verify && typeof verify !== "function") {
            throw new CommandError(
                `Flag verify must be a function`,
            )
        }
        this.verify_ = verify
    }

    verify(v: TV) {
        this._verifyValues(v)
        const verify = this.verify_
        return verify ? verify(v) : undefined
    }
    reset(): void {
        this.value_ = null
    }
    defaultString(): string {
        const val = this.default
        if (val !== null) {
            if (Array.isArray(val)) {
                if (val.length != 0) {
                    return `(default ${JSON.stringify(val)})`
                }
            } else {
                switch (typeof val) {
                    case 'string':
                        if (val !== "") {
                            return (`(default ${JSON.stringify(val)})`)
                        }
                        break
                    case 'boolean':
                        if (val) {
                            return (`(default ${val})`)
                        }
                        break
                    case 'number':
                        if (val != 0) {
                            return (`(default ${val})`)
                        }
                        break
                    case 'bigint':
                        if (val != BigInt(0)) {
                            return (`(default ${val})`)
                        }
                        break
                }
            }
        }
        return ''
    }
    valuesString(): string {
        const vals = this.values
        if (vals && vals.length != 0) {
            return `(values ${JSON.stringify(vals)})`
        }
        return ""
    }
    parse(_: string) { }
    isBool(): boolean {
        return false
    }
    guess(input: string, levenshteinDistance?: number | null): string | null {
        return null
    }
}

function guessString(input: string, values?: string[] | null, levenshteinDistance?: number | null): string | null {
    if (values) {
        let found = Number.isFinite(levenshteinDistance) ? levenshteinDistance! : 2
        if (found > 0) {
            let v: string | null = null
            let i
            for (const val of values) {
                const s = `${val}`
                i = getLevenshteinDistance(input, s)
                if (i <= found) {
                    found = i
                    v = s
                }
            }
            return v
        }
    }
    return null
}
/**
 * A flag of type string
 */
export class FlagString extends Flag<string> {
    constructor(opts: FlagOptions<string>) {
        super(opts, 'string')
    }
    override async parse(s: string) {
        await this.verify(s)
        this.value_ = s
    }
    override guess(input: string, levenshteinDistance?: number | null): string | null {
        return guessString(input, this.values, levenshteinDistance)
    }
}
/**
 * A flag of type string[]
 */
export class FlagStrings extends Flag<string[], string> {
    constructor(opts: FlagOptions<string[], string>) {
        super(opts, 'string[]')
    }
    override async parse(s: string) {
        await this.verify(s)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(s)
    }
    override guess(input: string, levenshteinDistance?: number | null): string | null {
        return guessString(input, this.values, levenshteinDistance)
    }
}
/**
 * A flag of type number
 */
export class FlagNumber extends Flag<number> {
    constructor(opts: FlagOptions<number>) {
        super(opts, 'number')
    }
    override async parse(s: string) {
        const val = parseFloat(s)
        await this.verify(val)
        this.value_ = val
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (isNaN(v)) {
            throw new Error('is nan')
        }
    }
}
/**
 * A flag of type number[]
 */
export class FlagNumbers extends Flag<number[], number> {
    constructor(opts: FlagOptions<number[], number>) {
        super(opts, 'number[]')
    }
    override async parse(s: string) {
        const val = parseFloat(s)
        await this.verify(val)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(val)
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (isNaN(v)) {
            throw new Error('is nan')
        }
    }
}
/**
 * A flag of type int
 */
export class FlagInt extends Flag<number> {
    constructor(opts: FlagOptions<number>) {
        super(opts, 'int')
    }
    override async parse(s: string) {
        const val = parseInt(s)
        await this.verify(val)
        this.value_ = val
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (!Number.isSafeInteger(v)) {
            throw new Error('is not safe integer')
        }
    }
}
/**
 * A flag of type int[]
 */
export class FlagInts extends Flag<number[], number> {
    constructor(opts: FlagOptions<number[], number>) {
        super(opts, 'int[]')
    }
    override async parse(s: string) {
        const val = parseInt(s)
        await this.verify(val)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(val)
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (!Number.isSafeInteger(v)) {
            throw new Error('is not safe integer')
        }
    }
}
/**
 * A flag of type uint
 */
export class FlagUint extends Flag<number> {
    constructor(opts: FlagOptions<number>) {
        super(opts, 'uint')
    }
    override async parse(s: string) {
        const val = parseInt(s)
        await this.verify(val)
        this.value_ = val
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (!Number.isSafeInteger(v) || v < 0) {
            throw new Error('is not safe unsigned integer')
        }
    }
}
/**
 * A flag of type uint[]
 */
export class FlagUints extends Flag<number[], number> {
    constructor(opts: FlagOptions<number[], number>) {
        super(opts, 'uint[]')
    }
    override async parse(s: string) {
        const val = parseInt(s)
        await this.verify(val)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(val)
    }
    override verify(v: number) {
        this._verifyValues(v)
        const f = this.verify_
        if (f) {
            return f(v)
        } else if (!Number.isSafeInteger(v) || v < 0) {
            throw new Error('is not safe unsigned integer')
        }
    }
}
/**
 * A flag of type bigint
 */
export class FlagBigint extends Flag<bigint> {
    constructor(opts: FlagOptions<bigint>) {
        super(opts, 'bigint')
    }
    override async parse(s: string) {
        const val = BigInt(s)
        await this.verify(val)
        this.value_ = val
    }
}
/**
 * A flag of type bigint[]
 */
export class FlagBigints extends Flag<bigint[], bigint> {
    constructor(opts: FlagOptions<bigint[], bigint>) {
        super(opts, 'bigint[]')
    }
    override async parse(s: string) {
        const val = BigInt(s)
        await this.verify(val)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(val)
    }
}

/**
 * A flag of type boolean
 */
export class FlagBoolean extends Flag<boolean> {
    constructor(opts: FlagOptions<boolean>) {
        super(opts, 'bool')
    }
    override isBool(): boolean {
        return true
    }
    override async parse(s: string) {
        const val = parseBool(s)
        await this.verify(val)
        this.value_ = val
    }
}
/**
 * A flag of type boolean[]
 */
export class FlagBooleans extends Flag<boolean[], boolean> {
    constructor(opts: FlagOptions<boolean[], boolean>) {
        super(opts, 'bool[]')
    }
    override isBool(): boolean {
        return true
    }
    override async parse(s: string) {
        const val = parseBool(s)
        await this.verify(val)
        if (!this.value_) {
            this.value_ = []
        }
        this.value_.push(val)
    }
}