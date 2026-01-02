export function compareString(l: string, r: string): number {
    if (l == r) {
        return 0
    }
    return l < r ? -1 : 1
}
export function formatUsage(s: string) {
    return s.replace(/\s+/g, " ")
}
export function parseBool(v: string): boolean {
    switch (v) {
        case 'false':
        case 'FALSE':
        case 'False':
        case '0':
            return false
    }
    return true
}