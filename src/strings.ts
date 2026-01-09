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
export function getLevenshteinDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length

    const matrix: number[][] = Array.from({ length: n + 1 }, () =>
        new Array(m + 1).fill(0)
    )

    for (let i = 0; i <= n; i++) {
        matrix[i]![0] = i
    };
    for (let j = 0; j <= m; j++) {
        matrix[0]![j] = j
    }

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i]![j]! = matrix[i - 1]![j - 1]!
            } else {
                matrix[i]![j] = Math.min(
                    matrix[i - 1]![j - 1]! + 1,
                    matrix[i]![j - 1]! + 1,
                    matrix[i - 1]![j]! + 1
                );
            }
        }
    }
    return matrix[n]![m]!
}