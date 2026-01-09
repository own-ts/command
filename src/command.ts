import { CommandError } from "./errors";
import { FlagBoolean } from "./flag";
import { Flags, type CommandCallback, type ICommand } from "./flags";
import { compareString, formatUsage, getLevenshteinDistance } from "./strings";

/**
 * Command definition options
 */
export interface CommandOptions {
    /**
     * Command name
     */
    name: string
    /**
     * Describe the usage of this command
     * @remarks
     * Line breaks are not allowed, because they will be displayed when listing subcommands. If there is a line break, it may disrupt the typesetting of the description information
     */
    usage?: string

    /**
     * Detailed description of the command
     * 
     * @remarks
     * Here you can write detailed usage instructions including some usage examples
     */
    usageLong?: string

    /**
     * Called when the user specifies to execute this command/subcommand
     */
    run?: CommandCallback | undefined | null
    /**
     * If you want to define flags for a command, you should not specify the 'run' attribute but the 'prepare' attribute
     * @remarks
     * The passed 'flgas' is an example of the {@link Flags} that are associated with this command to specify flags for the command
     * 
     * If the callback function specified by prepare returns non-undefined, its return value will override the 'run' attribute, and if it returns undefined, it will not affect the run attribute
     */
    prepare?: (
        flags: Flags,
        cmd: Command,
    ) => CommandCallback | undefined | null
}
/**
 * A command or subcommand
 */
export class Command implements ICommand {
    parent?: ICommand | undefined | null
    readonly name: string
    readonly usage: string
    readonly usageLong: string
    readonly flags: Flags
    readonly run: CommandCallback | null | undefined
    /**
     * subcommand
     */
    readonly children = new Map<string, Command>()

    child(name: string): ICommand | null {
        return this.children.get(name) ?? null
    }
    guess(name: string, levenshteinDistance?: number | null): ICommand | null {
        let found = Number.isFinite(levenshteinDistance) ? levenshteinDistance! : 2
        let v: ICommand | null = null
        let i
        for (const [key, val] of this.children) {
            i = getLevenshteinDistance(name, key)
            if (i <= found) {
                found = i
                v = val
            }
        }
        return v
    }
    hasChildren(): boolean {
        return this.children.size ? true : false
    }
    constructor(opts: CommandOptions) {
        const name = opts.name
        if (typeof name !== 'string') {
            throw new CommandError(
                `Command name must be one of string | undefined | null`,
            )
        } else if (name.startsWith('-')) {
            throw new CommandError(
                `Command names cannot be prefixed with -`,
            )
        }

        this.name = name

        const usage = opts.usage ?? ''
        if (typeof usage !== 'string') {
            throw new CommandError(
                `Command usage must be one of string | undefined | null`,
            )
        }
        this.usage = formatUsage(usage)

        const usageLong = opts.usageLong ?? ''
        if (typeof usageLong !== 'string') {
            throw new CommandError(
                `Command long must be one of string | undefined | null`,
            )
        }
        this.usageLong = usageLong === '' ? this.usage : usageLong

        const flags = new Flags(this)

        this.flags = flags
        this.run = opts.prepare ? opts.prepare(flags, this) : opts.run
    }
    /**
     * Add subcommands to commands
     * @param cmds
     */
    add(...cmds: Array<Command | CommandOptions>) {
        if (cmds.length) {
            const children = this.children
            for (const opts of cmds) {
                const cmd = opts instanceof Command ? opts : new Command(opts)
                const parent = cmd.parent
                if (parent) {
                    throw new CommandError(
                        `command "${cmd.name}" already added to "${parent.use()}"`,
                    )
                }
                const key = cmd.name
                if (children.has(key)) {
                    throw new CommandError(`command "${this.use()}" already has command ${key}`)
                } else {
                    cmd.parent = this
                    children.set(key, cmd)
                }
            }
        }
        return this
    }
    /**
     * Return command string
     */
    use(): string {
        const strs = [this.name]
        for (let parent = this.parent; parent; parent = parent.parent) {
            strs.push()
            strs.push(parent.name)
        }
        return strs.reverse().join(' ')
    }
    /**
     * Get the description string of command usage
     */
    toString(err?: boolean): string {
        const minpad = 8
        const use = this.use()
        const strs = err ? [] : [this.usageLong === '' ? this.usage : this.usageLong]
        if (strs.length == 0) {
            strs.push("Usage:")
        } else {
            strs.push("\nUsage:")
        }
        strs.push(`  ${use} [flags]`)
        const children = this.children
        if (children.size) {
            strs.push(`  ${use} [command]

Available Commands:`);
            const arrs = new Array<Command>()
            let pad = 0;
            for (const v of children.values()) {
                const len = v.name.length
                if (len > pad) {
                    pad = len
                }
                arrs.push(v)
            }
            pad += 3;
            if (pad < minpad) {
                pad = minpad
            }
            arrs.sort((l, r) => compareString(l.name, r.name))
            for (const child of arrs) {
                strs.push(`  ${child.name.padEnd(pad)}${child.usage}`)
            }
        }

        const flags = this.flags
        let sp = 1
        let lp = 4 + 1 + 8
        for (const f of flags) {
            if (sp < f.short.length) {
                sp = f.short.length
            }
            const n = f.name.length + f.type.length + 1
            if (lp < n) {
                lp = n
            }
        }
        if (lp < minpad) {
            lp = minpad
        }
        strs.push(`\nFlags:
  -${"h".padEnd(sp)}, --${"help bool".padEnd(lp)}   help for ${this.name}`)
        for (const f of flags) {
            let s = "";
            let str = f.defaultString()
            if (str != "") {
                s += " " + str
            }
            str = f.valuesString()
            if (str != "") {
                s += " " + str
            }

            if (f.short == "") {
                strs.push(
                    `   ${"".padEnd(sp)}  --${(f.name + ' ' + f.type).padEnd(lp)
                    }   ${f.usage}${s}`,
                )
            } else {
                strs.push(
                    `  -${f.short.toString().padEnd(sp)}, --${(f.name + ' ' + f.type).padEnd(lp)
                    }   ${f.usage}${s}`,
                )
            }
        }
        if (children.size) {
            strs.push(
                `\nUse "${use} [command] --help" for more information about a command.`,
            )
        }
        return strs.join("\n")
    }
    /**
     * Use console.log output usage
     */
    println() {
        console.log(this.toString())
    }
}
