import type { FormatOptions } from 'sql-formatter'


export function getFormattingOptions(dialect: string): FormatOptions {
    const baseOptions: FormatOptions = {
        keywordCase: 'upper',
        indentStyle: 'standard',
        linesBetweenQueries: 0,
        tabWidth: 2,
        useTabs: false,
        identifierCase: 'preserve',
        dataTypeCase: 'preserve',
        functionCase: 'preserve',
        denseOperators: true,
        logicalOperatorNewline: 'before',
        expressionWidth: 50,
        newlineBeforeSemicolon: false,
        paramTypes: {
            numbered: ['?'],
            named: [':'],
            quoted: ['$'],
            custom: []
        }
    }

    if (dialect === 'mysql') {
        return {
            ...baseOptions,
            paramTypes: {
                ...baseOptions.paramTypes,
                custom: [{ regex: '_utf8mb4' }]
            }
        }
    }

    return baseOptions
} 