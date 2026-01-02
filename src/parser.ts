import type { IFlag } from "./flag";
import type { ICommand } from "./flags";
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

export async function parseCommand(args: string[], cmd: ICommand, opts?: ParseCommandOptions) {
    const strs: string[] = []
    let hasChildren = cmd.hasChildren()
    let flag: IFlag<any, any> | undefined
    for (const arg of args) {
        if (hasChildren) {
            const found = cmd.child(arg)
            if (found) {
                cmd = found
                hasChildren = cmd.hasChildren()
                continue
            } else if (!opts?.allowUnknowCommand) {
                throw Error(`Unknow command: ${arg}`)
            }
            hasChildren = false
        }

        if (flag) {
            await flag.parse(arg)
            flag = undefined
            continue
        }
        if (arg === '-') {
            strs.push(arg)
            continue
        } else if (arg.startsWith('--')) {
            const { name, value } = getLogName(arg.substring(2))
            flag = cmd.flags.find(name, false)
            if (flag) {
                if (value.startsWith('=')) {
                    await flag.parse(value.substring(1))

                    flag = undefined
                } else if (flag.isBool()) {
                    await flag.parse('1')
                    flag = undefined
                }
                continue
            } else if (!opts?.allowUnknowFlag) {
                throw Error(`Unknow flag: --${name}`)
            }
        } else if (arg.startsWith('-')) {
            let name = arg.substring(1, 2)
            flag = cmd.flags.find(name, true)
            if (flag) {
                let s = arg.substring(3)
                while (true) {
                    if (s === '') {
                        if (flag.isBool()) {
                            await flag.parse('1')
                            flag = undefined
                        }
                        break
                    } else if (s.startsWith('=')) {
                        await flag.parse(s.substring(1))
                        flag = undefined
                        break
                    } else if (!flag.isBool()) {
                        await flag.parse(s)
                        flag = undefined
                        break
                    }
                    await flag.parse('1')
                    name = s.substring(0, 1)
                    flag = cmd.flags.find(name, true)
                    if (!flag) {
                        throw Error(`Unknow flag: -${name}`)
                    }
                }
                continue
            } else if (!opts?.allowUnknowFlag) {
                throw Error(`Unknow flag: -${name}`)
            }
        }
        strs.push(arg)
    }
    const run = cmd.run
    if (run) {
        return run(strs, cmd)
    }
}