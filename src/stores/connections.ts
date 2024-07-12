import { defineStore } from "pinia";
import api from "@/api/connections";
import { debounce } from 'lodash';

import { Connection, DbType } from '@/types/connections';

// Define interfaces for the state and other objects
interface State {
    dbTypes: DbType[];
    connections: Connection[];
    currentConnection: Connection | null;
    sourceConnection: Connection | null;
    targetConnection: Connection | null;
    currentFilter: string;
    ssh: any; // Define the proper type if known
    ssl: any; // Define the proper type if known
}

export const useConnectionsStore = defineStore("connections", {
    state: (): State => ({
        dbTypes: [
            { id: 0, type: "All", logo: "/images/db-logos/all.svg" },
            { id: 1, type: "PostgreSQL", logo: "/images/db-logos/postgresql.svg" },
            { id: 2, type: "MySQL", logo: "/images/db-logos/mysql.svg" },
            { id: 3, type: "SQLServer", logo: "/images/db-logos/sql-server.svg" },
            { id: 4, type: "Azure", logo: "/images/db-logos/azure.svg" },
            { id: 5, type: "Oracle", logo: "/images/db-logos/oracle.svg" },
            { id: 6, type: "DB2", logo: "/images/db-logos/db2.svg" },
            { id: 7, type: "Firebird", logo: "/images/db-logos/firebird.svg" },
            { id: 8, type: "Interbase", logo: "/images/db-logos/interbase.svg" },
            { id: 9, type: "Access", logo: "/images/db-logos/access.svg" },
            { id: 10, type: "FoxPro", logo: "/images/db-logos/foxpro.svg" },
            { id: 11, type: "SQLite", logo: "/images/db-logos/sqlite.svg" },
        ],
        connections: [],
        currentConnection: null,
        sourceConnection: null,
        targetConnection: null,
        currentFilter: "",
        ssh: null,
        ssl: null,
    }),
    getters: {
        allConnections(state: State): Connection[] {
            return state.connections;
        },
        countConnections(state: State): number {
            return state.connections
                .filter((el) => {
                    return (
                        el.type &&
                        el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
                    );
                }).length;
        },
        currentConnectionIndexInArray(state: State): number {
            return state.connections.indexOf(state.currentConnection!);
        },
        connectionsByType(state: State): Connection[] {
            return state.connections
                .filter((el) => {
                    return (
                        el.type &&
                        el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
                    );
                })
                .sort((a, b) => (b.created as number) - (a.created as number));
        },
    },
    actions: {
        setCurrentConnection(id: string) {
            const curConnection = this.connections.filter((c) => {
                return c.id === id;
            });
            this.currentConnection = curConnection[0];
        },
        connectionByID(id: string): Connection | null {
            const connection = this.connections.find((c) => c.id === id);
            return connection || null;
        },
        setFilter(filter: string) {
            this.currentFilter = filter;
        },
        saveConnection: debounce(async function (this: any) {
            try {
                const connection = this.currentConnection;
                if (this.ssh !== null) {
                    connection!.ssh = this.ssh;
                }
                if (this.ssl !== null) {
                    connection!.ssl = this.ssl;
                }
                if (!connection!.id) {
                    await api.createConnection(connection!);
                } else {
                    await api.updateConnection(connection!);
                }
                await this.refreshConnections();
            } catch (error) {
                console.error('Failed to save connection:', error);
                throw error;
            }
        }, 500),
        refreshConnections: debounce(async function (this: State) {
            try {
                this.connections = await api.getConnections() as Connection[];
            } catch (error) {
                console.error('Failed to refresh connections:', error);
                throw error;
            }
        }, 500),
        deleteConnection: debounce(async function (this: any, id: string) {
            try {
                const index = this.connections.findIndex((connection: Connection) => connection.id === id);
                if (index !== -1) {
                    this.connections.splice(index, 1);
                }
                await api.deleteConnection(id);
            } catch (error) {
                console.error('Failed to delete connection:', error);
                throw error;
            }
        }, 500),
        cloneConnection: debounce(async function (this: any, id: string) {
            try {
                const resp = await api.cloneConnection(id) as Connection;
                this.currentConnection = {
                    ...this.currentConnection!,
                    id: resp.id,
                    created: resp.created,
                };
                this.saveConnection();
            } catch (error) {
                console.error('Failed to clone connection:', error);
                throw error;
            }
        }, 500),
        async testConnection(json: Record<string, unknown>) {
            try {
                const status = await api.testConnection(json);
                console.log(status);
            } catch (error) {
                console.error('Failed to test connection:', error);
                throw error;
            }
        },
        resetCurrentConnection() {
            this.currentConnection = null;
        },
        async clearConnections() {
            this.connections.length = 0;
        },
        updateSSHParams(ssh: any) {
            this.ssh = ssh;
        },
        updateSSLParams(ssl: any) {
            this.ssl = ssl;
        },
    },
});
