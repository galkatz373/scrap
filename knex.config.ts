import Knex from 'knex';

export const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: './src/data.db',
  },
  useNullAsDefault: true,
});
