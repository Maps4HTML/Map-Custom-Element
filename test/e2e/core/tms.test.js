describe("Playwright Map Element Tests", () => {
  beforeAll(async () => {
    await page.goto(PATH + "tms.html");
  });

  afterAll(async function () {
    await browser.close();
  });

  test("Painting tiles are in proper order", async () => {
    let tileOrder = ["1/0/1", "1/0/0", "1/1/1", "1/1/0"]
    for (let i = 0; i < 4; i++) {
      const feature = await page.$eval(
        `xpath=//html/body/mapml-viewer >> css=div > div.leaflet-pane.leaflet-map-pane > div.leaflet-pane.leaflet-overlay-pane > div > div.leaflet-layer.mapml-templatedlayer-container > div > div > div:nth-child(${i + 1}) > img`,
        (tile) => tile.getAttribute("src")
      );
      expect(feature).toEqual(`https://maps4html.org/TiledArt-Rousseau/TheBanksOfTheBièvreNearBicêtre/${tileOrder[i]}.png`);
    }
  });
});