import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs-extra';

type Scrap = {
  imdbRating: number;
  title: string;
  year: string;
  image: string;
  url: string;
  popularity: string;
  additional?: {
    ageRating: string;
    duration: string;
    yearsRunning: string;
    genres: string[];
  };
};

enum Genre {
  Drama = 'Drama',
  Comedy = 'Comedy',
  Crime = 'Crime',
  Thriller = 'Thriller',
  Mystery = 'Mystery',
  SciFi = 'Sci-Fi',
  Short = 'Short',
}

const checkDiff = (oldData: Scrap[], newData: Scrap[]) => {
  const newDataName = newData.map(({ title }) => title);
  const oldDataName = oldData.map(({ title }) => title);
  const diff = newDataName.filter((title) => !oldDataName.includes(title));
  const newDataFiltered = newData.filter(({ title }) => diff.includes(title));
  return newDataFiltered;
};

(async () => {
  const oldDataFile = readFileSync('./src/data.json', 'utf8');
  const oldData: Scrap[] = oldDataFile ? JSON.parse(oldDataFile) : [];

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.imdb.com/chart/tvmeter/?ref_=nv_tvv_mptv');

  const rows = await page.locator('.lister-list > tr');
  const rowsHandler = await rows.elementHandles();

  const dataArr: Scrap[] = [];

  for (const row of rowsHandler) {
    const titleNode = await row.$('.titleColumn a');
    const title = await titleNode.textContent();

    const yearNode = await row.$('.titleColumn > .secondaryInfo');
    const year = (await yearNode.textContent()).replace(/[{()}]/g, '');

    const imdbRatingNode = await row.$('.imdbRating');
    const imdbRatingNumber = Number(await imdbRatingNode.textContent());

    const imageNode = await row.$('.posterColumn a img');
    const image = await imageNode.getAttribute('src');

    const urlNode = await row.$('.titleColumn a');
    const url = await urlNode.getAttribute('href');

    const popularityNode = await row.$('.titleColumn .velocity');
    const popularity = await popularityNode.textContent();

    if (imdbRatingNumber > 9.2) {
      dataArr.push({
        popularity,
        title,
        image,
        imdbRating: imdbRatingNumber,
        year,
        url,
      });
    }
  }

  for (const dataItem of dataArr) {
    await page.goto(`https://www.imdb.com${dataItem.url}`);
    const generalDetails = await page.locator('[data-testid="hero-title-block__metadata"] > li');

    const yearsRunningNode = await generalDetails.nth(1).locator('span');
    const yearsRunning = await yearsRunningNode.textContent();

    const ageRatingNode = await generalDetails.nth(2).locator('span');
    const ageRating = await ageRatingNode.textContent();

    const durationNode = generalDetails.nth(3);
    let duration = 'not specified';
    if (await durationNode.isVisible()) {
      duration = await durationNode.textContent();
    }

    await page.waitForSelector("[data-testid='storyline-genres']");
    const genres = await page.locator("[data-testid='storyline-genres'] > div > ul > li > a");
    const genresHandler = await genres.elementHandles();

    const genresData: string[] = [];

    for (const genre of genresHandler) {
      const genreText = await genre.textContent();
      genresData.push(genreText);
    }

    dataItem.additional = {
      ageRating,
      duration,
      yearsRunning,
      genres: genresData,
    };
  }
  const result = checkDiff(oldData, dataArr);
  writeFileSync('./src/data.json', JSON.stringify([...result, ...oldData]));
  await browser.close();
})();
