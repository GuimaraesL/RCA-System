// Declaração de tipos para sql.js
declare module 'sql.js' {
    interface SqlJsStatic {
        Database: typeof Database;
    }

    interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    interface Statement {
        bind(params?: any[]): boolean;
        step(): boolean;
        get(): any[];
        getColumnNames(): string[];
        free(): boolean;
        run(params?: any[]): void;
        reset(): void;
    }

    class Database {
        constructor(data?: ArrayLike<number> | Buffer | null);
        run(sql: string, params?: any[]): Database;
        exec(sql: string): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
    export default initSqlJs;
    export { Database, Statement, QueryExecResult };
}
