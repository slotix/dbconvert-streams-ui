import { defineStore } from 'pinia'

export const useDbTypes = defineStore('dbTypes', {
  state: () => ({
    dbTypes: [
      {
        id: 0,
        type: 'All',
        logo: 'src/assets/images/db-logos/all.svg'
      },
      {
        id: 1,
        type: 'PostgreSQL',
        logo: 'src/assets/images/db-logos/postgresql.svg'
      },
      {
        id: 2,
        type: 'MySQL',
        logo: 'src/assets/images/db-logos/mysql.svg'
      },
      {
        id: 3,
        type: 'SQLServer',
        logo: 'src/assets/images/db-logos/sql-server.svg'
      },
      {
        id: 4,
        type: 'Azure',
        logo: 'src/assets/images/db-logos/azure.svg'
      },
      {
        id: 5,
        type: 'Oracle',
        logo: 'src/assets/images/db-logos/oracle.svg'
      },
      {
        id: 6,
        type: 'DB2',
        logo: 'src/assets/images/db-logos/db2.svg'
      },
      {
        id: 7,
        type: 'Firebird',
        logo: 'src/assets/images/db-logos/firebird.svg'
      },
      {
        id: 8,
        type: 'Interbase',
        logo: 'src/assets/images/db-logos/interbase.svg'
      },
      {
        id: 9,
        type: 'Access',
        logo: 'src/assets/images/db-logos/access.svg'
      },
      {
        id: 10,
        type: 'FoxPro',
        logo: 'src/assets/images/db-logos/foxpro.svg'
      },
      {
        id: 11,
        type: 'SQLite',
        logo: 'src/assets/images/db-logos/sqlite.svg'
      }
    ],
  }),
});
