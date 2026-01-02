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

export function formatDateTime(date: Date = new Date()): string {
    const year: number = date.getFullYear()
    const month: string = String(date.getMonth() + 1).padStart(2, '0')
    const day: string = String(date.getDate()).padStart(2, '0')

    const hours: string = String(date.getHours()).padStart(2, '0')
    const minutes: string = String(date.getMinutes()).padStart(2, '0')
    const seconds: string = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}