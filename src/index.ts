import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs-extra';
import { createTransport } from 'nodemailer';

type Scrap = {
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

const sendEmail = async (data: Scrap[]) => {
  const transporter = createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'itzel.toy34@ethereal.email',
        pass: 'SywcpuergUxDdrKXsY'
    }
  });
  await transporter.sendMail({
    from: '"Automated Scrapper" <automated@scraper.com>',
    to: "galkatz373@gmail.com",
    subject: 'Automated Scraper Show IMDB',
    html: `
    <html>
  <div class="title">NEW TV Shows Recommended For You:</div>
  <table>
    <thead style="text-align: left">
      <th></th>
      <th></th>
      <th>Title</th>
      <th>IMDB Rating</th>
      <th>Age Rating</th>
      <th>Duration</th>
      <th>Genres</th>
    </thead>

    <tbody>
      ${data.map(
        ({ image, imdbRating, popularity, title, url, additional: { ageRating, duration, genres, yearsRunning } }) => `
      <tr>
        <td title="popularity" style="padding-right: 1rem">${popularity}</td>
        <td style="padding-right: 1rem">
          <img
            width="45"
            height="67"
            style="margin-bottom: 10px"
            src="${image}"
          />
        </td>
        <td style="padding-right: 1rem">
          <a href="https://www.imdb.com${url}"> ${title} (${yearsRunning})</a>
        </td>
        <td style="padding-right: 1rem">${imdbRating}</td>
        <td style="padding-right: 1rem">${ageRating}</td>
        <td style="padding-right: 1rem">${duration}</td>
        <td style="padding-right: 1rem">${genres}</td>
      </tr>
      `
      )}
    </tbody>
  </table>
</html>
    `,
  });
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
  if (result.length > 0) {
    writeFileSync('./src/data.json', JSON.stringify([...result, ...oldData]));
    await sendEmail(result);
  }
  await browser.close();
})();
