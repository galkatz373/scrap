import { knex } from '../knex.config';

(async () => {
  await knex.schema.createTable('shows', (t) => {
    t.increments();
    t.string('title');
    t.float('imdbRating');
    t.string('image');
    t.string('url');
    t.string('popularity');
    t.string('ageRating');
    t.string('duration');
    t.string('yearsRunning');
    t.string('genres');
    t.string('episodes');
  });
  process.exit(0);
})();
