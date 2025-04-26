type SQLDialect = 'mysql' | 'postgresql' | 'sqlite' | 'sql' | 'bigquery' | 'db2' | 'hive' | 'mariadb' | 'plsql' | 'n1ql' | 'transactsql'

export function getDialectFromConnectionType(connectionType: string): SQLDialect {
    const dialectMap: Record<string, SQLDialect> = {
        'PostgreSQL': 'postgresql',
        'MySQL': 'mysql',
        'SQLite': 'sqlite',
        'Oracle': 'plsql',
        'SQLServer': 'transactsql',
        'DB2': 'db2',
        'BigQuery': 'bigquery',
        'Hive': 'hive',
        'MariaDB': 'mariadb'
    }

    return dialectMap[connectionType] || 'sql'
} 