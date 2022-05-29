export type Scrap = {
  imdbRating: number;
  title: string;
  image: string;
  url: string;
  popularity: string;
  additional?: {
    ageRating: string;
    duration: string;
    yearsRunning: string;
    genres: string[];
    episodes: string;
  };
};
