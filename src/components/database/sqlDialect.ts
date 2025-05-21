import type { FormatOptions } from 'sql-formatter'

// Define specific options type that matches what sql-formatter actually accepts
type SqlFormatterOptions = FormatOptions & { 
  language?: 'sql' | 'mysql' | 'postgresql' | 'db2' | 'plsql' | 'n1ql' | 'redshift' | 'spark' | 'tsql' | 'mariadb' | 'sqlite' | 'bigquery' | 'singlestoredb' | 'snowflake' | 'transactsql'
}

export function getFormattingOptions(dialect: string): SqlFormatterOptions {
    const baseOptions: SqlFormatterOptions = {
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

    // Convert dialect to lowercase for case-insensitive comparison
    const normalizedDialect = dialect.toLowerCase()
    
    if (normalizedDialect.includes('mysql')) {
        return {
            ...baseOptions,
            language: 'mysql',
            paramTypes: {
                ...baseOptions.paramTypes,
                custom: [{ regex: '_utf8mb4' }]
            }
        }
    }
    
    if (normalizedDialect.includes('postgre')) {
        return {
            ...baseOptions,
            language: 'postgresql'
        }
    }

    return baseOptions
} 