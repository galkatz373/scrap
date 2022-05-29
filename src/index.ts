import { chromium } from 'playwright';
import { createTransport } from 'nodemailer';
import { Scrap } from './types';
import { checkDiff, insertData } from './db-operations';
require('dotenv').config();

const sendEmail = async (data: Scrap[]) => {
  const transporter = createTransport({
    host: 'smtp.gmail.com',
    service: 'gmail',
    port: 587,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: '"Automated Scrapper" <automated@scraper.com>',
    to: process.env.EMAIL_TO,
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
      <th>Episodes</th>
    </thead>

    <tbody>
      ${data.map(
        ({
          image,
          imdbRating,
          popularity,
          title,
          url,
          additional: { ageRating, duration, genres, episodes, yearsRunning },
        }) => `
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
        <td style="padding-right: 1rem">${episodes}</td>
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

    if (imdbRatingNumber > 9.3) {
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

    await page.waitForSelector("[data-testid='hero-subnav-bar-series-episode-count']");
    const episodesNode = await page.locator('[data-testid="hero-subnav-bar-series-episode-count"]');
    const episodes = await episodesNode.textContent();

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
      episodes,
    };
  }
  const result = await checkDiff(dataArr);
  if (result.length > 0) {
    await insertData(result);
    await sendEmail(result);
  }
  await browser.close();
})();
