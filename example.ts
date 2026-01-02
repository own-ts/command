import { Command, parseCommand, ParseCommandError } from "./index";

async function main() {
    const root = new Command({
        name: "my-app",
        usage: "A type-safe CLI example",
        prepare(flags) {
            // Define flags
            const port = flags.uint({
                name: "port",
                short: "p",
                default: 8080,
                usage: "port to listen on",
            });

            const debug = flags.bool({
                name: "debug",
                short: "d",
                usage: "enable verbose logging",
            });

            // Return the handler directly
            // 'port.value' is inferred as 'number'
            // 'debug.value' is inferred as 'boolean'
            return async (args) => {
                if (debug.value) {
                    console.log(
                        `Starting server in debug mode on port ${port.value}...`,
                    );
                } else {
                    console.log(`Starting server on port ${port.value}...`);
                }
                console.log("Extra arguments:", args);
            };
        },
    });

    // Add a Subcommand
    root.add({
        name: "greet",
        usage: "greet a user",
        prepare(flags) {
            const name = flags.string({
                name: "name",
                short: "n",
                default: "Guest",
                usage: "user to greet",
            });

            return (args) => {
                console.log(`Hello, ${name.value}!`);
            };
        },
    });

    // Parse and Execute
    try {
        await parseCommand(Bun.argv.slice(2), root);
    } catch (e) {
        if (e instanceof ParseCommandError) {
            // Automatically handles usage printing on errors
            console.log(`${e}`);
        } else {
            console.error("Runtime Error:", e);
        }
    }
}

main();