import { FlagBoolean, type IFlag } from "./flag";
import type { ICommand } from "./flags";
import { formatDateTime } from "./strings";
export class ParseCommandError extends Error {

}
function throwFlag(cmd: ICommand, message: string, options?: ErrorOptions): never {
    throw new ParseCommandError(`${message}
${cmd.toString(true)}

[${formatDateTime(new Date())}] ${message}`, options)
}
function throwCommand(cmd: ICommand, arg: string, options?: ErrorOptions): never {
    const message = `unknown command: ${JSON.stringify(arg)} for ${JSON.stringify(cmd.use())}`
    throw new ParseCommandError(`${message}
Run ${JSON.stringify(cmd.use() + ' --help')} for usage.
[${formatDateTime(new Date())}] ${message}`, options)
}

export interface ParseCommandOptions {
    /**
     * Whether to allow undefined flags
     * @default false
     */
    allowUnknowFlag?: boolean

    /**
     * Whether to allow undefined subcommands
     *  @default false
     */
    allowUnknowCommand?: boolean
}
function getLogName(s: string): { name: string, value: string } {
    const i = s.indexOf('=')
    if (i < 0) {
        return {
            name: s,
            value: ''
        }
    }
    return {
        name: s.substring(0, i),
        value: s.substring(i),
    }
}
export interface ParseCommandResult<T> {
    parsed?: boolean
    value?: T | undefined | null
    help?: boolean
}
export async function parseCommand<T>(args: string[], cmd: ICommand, opts?: ParseCommandOptions): Promise<ParseCommandResult<T>> {
    const strs: string[] = []
    let hasChildren = cmd.hasChildren()
    let flag: IFlag<any, any> | undefined
    let flagName = ''
    const help = new FlagBoolean({ name: 'help', short: 'h' })
    for (const arg of args) {
        if (help.value) {
            console.log(cmd.toString())
            return {
                parsed: true,
                help: true,
            }
        }
        if (hasChildren) {
            const found = cmd.child(arg)
            if (found) {
                cmd = found
                hasChildren = cmd.hasChildren()
                continue
            } else if (!opts?.allowUnknowCommand
                && !arg.startsWith('-h')
                && !arg.startsWith('--help=')
                && arg !== '--help') {
                throwCommand(cmd, arg)
            }
            hasChildren = false
        }

        if (flag) {
            try {
                await flag.parse(arg)
                flag = undefined
            } catch (e) {
                throwFlag(cmd,
                    `[${arg}] invalid argument ${JSON.stringify(arg)} for ${flagName} flag: ${e instanceof Error ? e.message : e}`,
                    {
                        cause: e,
                    }
                )
            }
            continue
        }
        if (arg === '-') {
            strs.push(arg)
            continue
        } else if (arg.startsWith('--')) {
            const { name, value } = getLogName(arg.substring(2))
            flagName = JSON.stringify('--' + name)
            flag = cmd.flags.find(name, false) ?? (name === 'help' ? help : undefined)
            if (flag) {
                let v = '1'
                try {
                    if (value.startsWith('=')) {
                        v = value.substring(1)
                        await flag.parse(v)

                        flag = undefined
                    } else if (flag.isBool()) {
                        await flag.parse(v)
                        flag = undefined
                    }
                } catch (e) {
                    throwFlag(cmd,
                        `[${arg}] invalid argument ${JSON.stringify(v)} for ${flagName} flag: ${e instanceof Error ? e.message : e}`,
                        {
                            cause: e,
                        }
                    )
                }
                continue
            } else if (!opts?.allowUnknowFlag) {
                throwFlag(cmd, `Unknow flag: ${JSON.stringify(name)} in ${arg}`)
            }
        } else if (arg.startsWith('-')) {
            let name = arg.substring(1, 2)
            flagName = JSON.stringify('-' + name)
            flag = cmd.flags.find(name, true) ?? (name === 'h' ? help : undefined)
            if (flag) {
                let s = arg.substring(2)
                while (true) {
                    let v = '1'
                    try {
                        if (s === '') {
                            if (flag.isBool()) {
                                await flag.parse(v)
                                flag = undefined
                            }
                            break
                        } else if (s.startsWith('=')) {
                            v = s.substring(1)
                            await flag.parse(v)
                            flag = undefined
                            break
                        } else if (!flag.isBool()) {
                            v = s
                            await flag.parse(s)
                            flag = undefined
                            break
                        }
                        await flag.parse('1')
                    } catch (e) {
                        throwFlag(cmd,
                            `[${arg}] invalid argument ${JSON.stringify(v)} for ${flagName} flag: ${e instanceof Error ? e.message : e}`,
                            {
                                cause: e,
                            }
                        )
                    }
                    if (flag === help) {
                        break
                    }


                    name = s.substring(0, 1)
                    flagName = JSON.stringify('-' + name)
                    flag = cmd.flags.find(name, true) ?? (name === 'h' ? help : undefined)
                    if (!flag) {
                        throwFlag(cmd, `Unknow shorthand flag: ${JSON.stringify(name)} in ${arg}`)
                    }
                    s = s.substring(1)
                }
                continue
            } else if (!opts?.allowUnknowFlag) {
                throwFlag(cmd, `Unknow shorthand flag: ${JSON.stringify(name)} in ${arg}`)
            }
        }
        strs.push(arg)
    }
    if (help.value) {
        console.log(cmd.toString())
        return {
            parsed: true,
            help: true,
        }
    }

    const run = cmd.run
    if (run) {
        return {
            parsed: true,
            value: await run(strs, cmd),
        }
    }
    return {
        parsed: true,
    }
}