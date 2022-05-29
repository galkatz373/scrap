import { knex } from '../knex.config';

(async () => {
  await knex('shows').delete();
  process.exit(0);
})();
