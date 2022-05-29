import { knex } from '../knex.config';
import { Scrap } from './types';

export const checkDiff = async (newData: Scrap[]) => {
  const shows = await knex('shows').select('*');

  // either a new tv show or an updated tv show based on both title and number of episodes
  const diff = newData.filter(({ title, additional: { episodes } }) => {
    const oldData = shows.find(({ title: oldTitle }) => oldTitle === title);
    if (oldData) {
      const oldEpisodes = oldData.episodes;
      return oldEpisodes !== episodes;
    }
    return true;
  });

  return diff;
};

export const insertData = async (data: Scrap[]) => {
  await knex('shows').insert(
    data.map((item) => ({
      title: item.title,
      imdbRating: item.imdbRating,
      image: item.image,
      url: item.url,
      popularity: item.popularity,
      ageRating: item.additional.ageRating,
      duration: item.additional.duration,
      yearsRunning: item.additional.yearsRunning,
      genres: item.additional.genres.join(', '),
      episodes: item.additional.episodes,
    }))
  );
};
