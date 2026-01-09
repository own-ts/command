import { FlagBoolean, type IFlag } from "./flag";
import type { CommandCallback, ICommand } from "./flags";
import { formatDateTime } from "./strings";
export class ParseCommandError extends Error {

}
function throwFlag(cmd: ICommand, message: string, mean?: string | null, options?: ErrorOptions): never {
    if (mean) {
        throw new ParseCommandError(`${message}
${cmd.toString(true)}

[${formatDateTime(new Date())}] ${message}

Did you mean this?
  --${mean}
`, options)
    } else {
        throw new ParseCommandError(`${message}
${cmd.toString(true)}

[${formatDateTime(new Date())}] ${message}`, options)
    }
}
function throwCommand(cmd: ICommand, arg: string, mean?: string, options?: ErrorOptions): never {
    const message = `unknown command: ${JSON.stringify(arg)} for ${JSON.stringify(cmd.use())}`
    if (mean) {
        throw new ParseCommandError(`${message}
Run ${JSON.stringify(cmd.use() + ' --help')} for usage.
[${formatDateTime(new Date())}] ${message}

Did you mean this?
  ${mean}
`, options)
    } else {
        throw new ParseCommandError(`${message}
Run ${JSON.stringify(cmd.use() + ' --help')} for usage.
[${formatDateTime(new Date())}] ${message}`, options)
    }
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

export enum RunMode {
    /**
     * Call each found command callback sequentially.
     */
    all,
    /**
     * Only call the callback defined by the last matching subcommand.
     */
    last,
    /**
     * Do not execute the callback; return the callback context of the matched command.
     */
    runner,
}
export interface ParseCommandOptions {
    /**
     * @default RunMode.last
     */
    mode?: RunMode

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
    /**
     * User-defined parameters passed to the callback
     */
    userdata?: any

    /**
     * The intelligent prompt distance parameter is disabled if it is less than 1.
     * @default 2
     */
    levenshteinDistance?: number
}
/**
 * Used to manually invoke the found command.
 */
export interface Runner {
    /**
     * Matched commands
     */
    cmd: ICommand
    /**
     * The arguments that should be passed to it
     */
    args: string[]
    /**
     * You can use it to store cmd.run callback result
     */
    result?: any
}
export interface ParseCommandResult {
    /**
     * If this value is returned after parsing help, it will be set to true
     */
    help?: boolean
    /**
     * Store callback results during automatic callback
     */
    values?: any[]
    /**
     * When manually calling a callback, the calling context is stored, which you can iterate through to perform sequential or parallel callbacks
     */
    runners?: Runner[]
}
/**
 * Parse the command line and invoke the command callback.
 * @param args Command line arguments. It should not include startup commands such as bun/deno run.
 * @param cmd Root command
 * @param opts Optional parsing details definition
 * @returns 
 */
export async function parseCommand(args: string[], cmd: ICommand, opts?: ParseCommandOptions): Promise<ParseCommandResult> {
    const mode = opts?.mode
    let userdata = opts?.userdata
    const allowUnknowCommand = opts?.allowUnknowCommand
    const allowUnknowFlag = opts?.allowUnknowFlag

    cmd.flags.reset()
    let strs: string[] = []
    let runner: Runner = {
        cmd: cmd,
        args: strs,
    }
    const runners = mode === RunMode.all || mode === RunMode.runner ? [runner] : undefined

    let flag: IFlag<any, any> | undefined
    let flagName = ''
    const help = new FlagBoolean({ name: 'help', short: 'h' })
    for (const arg of args) {
        if (help.value) {
            console.log(cmd.toString())
            return {
                help: true,
            }
        }
        if (flag) {
            try {
                await flag.parse(arg)
                flag = undefined
            } catch (e) {
                throwFlag(cmd,
                    `[${arg}] invalid argument ${JSON.stringify(arg)} for ${flagName} flag: ${e instanceof Error ? e.message : e}`,
                    undefined,
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
                        undefined,
                        {
                            cause: e,
                        }
                    )
                }
                continue
            } else if (!allowUnknowFlag) {
                const falg = cmd.flags.guess(name, opts?.levenshteinDistance)
                throwFlag(cmd, `Unknow flag: ${JSON.stringify(name)} in ${arg}`, falg?.name)
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
                            undefined,
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
            } else if (!allowUnknowFlag) {
                throwFlag(cmd, `Unknow shorthand flag: ${JSON.stringify(name)} in ${arg}`)
            }
        }

        if (!strs.length && cmd.hasChildren()) {
            const found = cmd.child(arg)
            if (found) {
                strs = []
                found.flags.reset()
                runner = {
                    cmd: found,
                    args: strs,
                }
                if (runners) {
                    runners.push(runner)
                }
                cmd = found
                continue
            } else if (!allowUnknowCommand) {
                throwCommand(cmd, arg, cmd.guess(arg, opts?.levenshteinDistance)?.name)
            }
        }
        strs.push(arg)
    }
    if (help.value) {
        console.log(cmd.toString())
        return {
            help: true,
        }
    }
    if (flag) {
        throwFlag(cmd,
            `flag needs an argument: ${flagName} in ${args[args.length - 1]}`
        )
    }
    switch (mode) {
        case RunMode.all:
            for (const runner of runners!) {
                const run = runner.cmd.run
                if (run) {
                    runner.result = await run(runner.args, userdata, runner.cmd)
                }
            }
            return {
                values: runners!.map((v) => v.result)
            }
        case RunMode.runner:
            return {
                runners: runners,
            }
    }
    const run = runner.cmd.run
    if (run) {
        runner.result = await run(runner.args, userdata, runner.cmd)
    }
    return {
        values: [
            runner.result
        ]
    }
}