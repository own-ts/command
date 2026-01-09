import { expect, test, describe } from "bun:test"
import { scanInput, formatOutput } from "./utils" // 請確保路徑正確

describe("scanInput() Comprehensive Tests", () => {
    test("Basic splitting", () => {
        expect(scanInput("ls -la /tmp")).toEqual(["ls", "-la", "/tmp"])
    })

    test("Handle multiple spaces between arguments", () => {
        expect(scanInput("ssh    -i  key.pem      user@host")).toEqual(["ssh", "-i", "key.pem", "user@host"])
    })

    test("Empty input and whitespace-only input", () => {
        expect(scanInput("")).toEqual([])
        expect(scanInput("   ")).toEqual([])
    })

    test("Quoted arguments with spaces", () => {
        expect(scanInput('mkdir "New Folder"')).toEqual(["mkdir", "New Folder"])
        expect(scanInput("mkdir 'New Folder'")).toEqual(["mkdir", "New Folder"])
    })

    test("Nested quotes (one inside another)", () => {
        // Double inside single: 'He said "Hello"' -> He said "Hello"
        expect(scanInput("'He said \"Hello\"'")).toEqual(['He said "Hello"'])
        // Single inside double: "It's me" -> It's me
        expect(scanInput('"It\'s me"')).toEqual(["It's me"])
    })

    test("Escaped characters", () => {
        // Escaped space: val\ ue -> val ue
        expect(scanInput("val\\ ue")).toEqual(["val ue"])
        // Escaped quotes: \" -> "
        expect(scanInput('cmd --name=\"John Doe\"')).toEqual(['cmd', '--name=John Doe'])
        expect(scanInput('cmd --name=\\"John Doe\\"')).toEqual(['cmd', '--name="John', 'Doe"'])
    })

    test("Mixed quoting and escaping", () => {
        const input = "export PATH=\$HOME/bin 'quoted string' \"double \\\"quote\\\"\""
        expect(scanInput(input)).toEqual([
            "export",
            "PATH=$HOME/bin",
            "quoted string",
            "double \"quote\""
        ])
    })

    test("Unclosed quotes (should process until end of string)", () => {
        expect(scanInput('echo "unclosed quote')).toEqual(["echo", "unclosed quote"])
    })
})

describe("formatOutput() Comprehensive Tests", () => {
    test("No ANSI sequences", () => {
        const input = "Plain text 123"
        expect(formatOutput(input)).toBe("Plain text 123")
    })

    test("Basic colors (3-bit/4-bit)", () => {
        const input = "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m"
        expect(formatOutput(input)).toBe("Red Green")
    })

    test("Rich colors (8-bit/24-bit RGB)", () => {
        // 256 colors: \x1b[38;5;160m
        // TrueColor: \x1b[38;2;255;0;0m
        const input = "\x1b[38;5;160mColor256\x1b[0m \x1b[38;2;255;0;0mTrueColor\x1b[0m"
        expect(formatOutput(input)).toBe("Color256 TrueColor")
    })

    test("Text styles (Bold, Italic, Underline)", () => {
        const input = "\x1b[1mBold\x1b[22m \x1b[3mItalic\x1b[23m \x1b[4mUnderline\x1b[24m"
        expect(formatOutput(input)).toBe("Bold Italic Underline")
    })

    test("Cursor movement and screen clearing", () => {
        const input = "Loading...\x1b[H\x1b[2JDone!" // Move home and clear screen
        expect(formatOutput(input)).toBe("Loading...Done!")
    })

    test("OSC sequences (e.g., Terminal Title)", () => {
        const input = "\x1b]0;My Terminal Window\x07Visible Text"
        expect(formatOutput(input)).toBe("Visible Text")
    })

    test("Carriage return and Tab characters (should be preserved)", () => {
        // formatOutput 只移除轉義序列，不應移除 \n, \r, \t
        const input = "Line 1\nLine 2\tTabbed"
        expect(formatOutput(input)).toBe("Line 1\nLine 2\tTabbed")
    })

    test("Complex mixed sequences", () => {
        const input = "\x1b[1A\x1b[2K\r\x1b[32m✔\x1b[0m Success"
        expect(formatOutput(input)).toBe("\r✔ Success")
    })
})