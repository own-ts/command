import { Command, parseCommand, ParseCommandError, type ICommand } from './index'


async function main(root: Command) {
    try {
        await parseCommand(Bun.argv.slice(2), root)
    } catch (e) {
        if (e instanceof ParseCommandError) {
            console.log(`${e}`)
        } else {
            console.log(e)
        }
    }
}
function handler(args: string[], _: any, cmd: ICommand) {
    console.log(cmd.name)
    console.log(' - args:', args)
    for (const item of cmd.flags) {
        console.log(` - ${item.name}:`, item.value)
    }
}
main(new Command({
    name: 'main.ts',
    usage: 'exampe flags',
    prepare(flags) {
        flags.int({
            name: 'int',
            short: 'i',
            usage: 'example flag int',
            values: [1, 2, 3],
        })
        flags.ints({
            name: 'ints',
            short: 'I',
            usage: 'example flag int[]',
        })
        flags.uint({
            name: 'uint',
            short: 'u',
            usage: 'example flag uint',
            default: 80,
        })
        flags.uints({
            name: 'uints',
            short: 'U',
            usage: 'example flag sint[]',
            default: [80, 2052]
        })
        flags.string({
            name: 'string',
            short: 's',
            usage: 'example flag string',
        })
        flags.strings({
            name: 'strings',
            short: 'S',
            usage: 'example flag string[]',
        })
        flags.bool({
            name: 'bool',
            short: 'b',
            usage: 'example flag bool',
        })
        flags.bools({
            name: 'bools',
            short: 'B',
            usage: 'example flag bool[]',
        })
        return handler
    },
}).add(
    {
        name: 'child',
        usage: 'subcommand example',
        prepare(flags) {
            flags.number({
                name: 'number',
                short: 'n',
                usage: 'example flag number',
            })
            flags.numbers({
                name: 'numbers',
                short: 'N',
                usage: 'example flag number[]',
            })
            flags.bigint({
                name: 'int',
                short: 'i',
                usage: 'example flag bigint',
            })
            flags.bigints({
                name: 'ints',
                short: 'I',
                usage: 'example flag bigint[]',
            })
            flags.bool({
                name: 'bool',
                short: 'b',
                usage: 'example flag bool',
            })
            flags.bools({
                name: 'bools',
                short: 'B',
                usage: 'example flag bool[]',
            })
            return handler
        }
    },
))
