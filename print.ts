// import { Command, parseCommand, ParseCommandError, type ICommand } from './index'

// async function main(root: Command) {
//     try {
//         await parseCommand(Bun.argv.slice(2), root)
//     } catch (e) {
//         if (e instanceof ParseCommandError) {
//             console.log(`${e}`)
//         } else {
//             console.log(e)
//         }
//     }
// }
// function handler(args: string[], cmd: ICommand) {
//     console.log(cmd.name)
//     console.log(' - args:', args)
//     for (const item of cmd.flags) {
//         console.log(` - ${item.name}:`, item.value)
//     }
// }
// main(new Command({
//     name: 'main.ts',
//     usage: 'exampe flags',
//     prepare(flags) {
//         flags.int({
//             name: 'int',
//             short: 'i',
//             usage: 'example flag int',
//         })
//         flags.ints({
//             name: 'ints',
//             short: 'I',
//             usage: 'example flag int[]',
//         })
//         flags.uint({
//             name: 'uint',
//             short: 'u',
//             usage: 'example flag uint',
//             default: 80,
//         })
//         flags.uints({
//             name: 'uints',
//             short: 'U',
//             usage: 'example flag sint[]',
//             default: [80, 2052]
//         })
//         flags.string({
//             name: 'string',
//             short: 's',
//             usage: 'example flag string',
//         })
//         flags.strings({
//             name: 'strings',
//             short: 'S',
//             usage: 'example flag string[]',
//         })
//         flags.bool({
//             name: 'bool',
//             short: 'b',
//             usage: 'example flag bool',
//         })
//         flags.bools({
//             name: 'bools',
//             short: 'B',
//             usage: 'example flag bool[]',
//         })
//         return handler
//     },
// }).add(
//     {
//         name: 'child',
//         usage: 'subcommand example',
//         prepare(flags) {
//             flags.number({
//                 name: 'number',
//                 short: 'n',
//                 usage: 'example flag number',
//             })
//             flags.numbers({
//                 name: 'numbers',
//                 short: 'N',
//                 usage: 'example flag number[]',
//             })
//             flags.bigint({
//                 name: 'int',
//                 short: 'i',
//                 usage: 'example flag bigint',
//             })
//             flags.bigints({
//                 name: 'ints',
//                 short: 'I',
//                 usage: 'example flag bigint[]',
//             })
//             flags.bool({
//                 name: 'bool',
//                 short: 'b',
//                 usage: 'example flag bool',
//             })
//             flags.bools({
//                 name: 'bools',
//                 short: 'B',
//                 usage: 'example flag bool[]',
//             })
//             return handler
//         }
//     },
// ))

import { Command, parseCommand, RunMode } from "./index";

// 1. Parent command handles global context (e.g., Auth)
const root = new Command({
    name: 'cloud',
    prepare(flags) {
        const token = flags.string({ name: 'token', usage: 'API Token' });

        return async (args, userdata) => {
            if (!token.value) throw new Error("Auth required! Use --token");
            console.log("--- Step 1: Global Authentication Success ---");
            userdata.token = token.value
            return { api: "connected", token: token.value };
        };
    }
});

// 2. Subcommand handles specific business logic
root.add(new Command({
    name: 'deploy',
    prepare(flags) {
        const env = flags.string({ name: 'env', default: 'prod' });

        return async (args, userdata) => {
            console.log(`--- Step 2: Deploying to [${env.value}] use [${userdata.token}] ---`);
            return "Deployment Success";
        };
    }
}));

// Execution: cloud --token secret-key deploy --env staging
const result = await parseCommand(['--token', 'key', 'deploy', '--env', 'staging'], root, {
    mode: RunMode.all,
    userdata: {}
});
console.log(result)