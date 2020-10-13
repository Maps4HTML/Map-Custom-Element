const playwright = require("playwright");
jest.setTimeout(50000);
(async () => {

  //expected topLeft values in the different cs, at the different
  //positions the map goes in
  let expectedPCRS = [
    { horizontal: -9373489.01871137, vertical: 11303798.154262971 },
    { horizontal: -9373489.01871137, vertical: 11303798.154262971 }];
  let expectedGCRS = [
    { horizontal: -128.07848522325827, vertical: -3.3883427348651636 },
    { horizontal: -128.07848522325827, vertical: -3.3883427348651636 }];
  let expectedFirstTileMatrix = [
    { horizontal: 2.57421875, vertical: 2.8515625 },
    { horizontal: 2.57421875, vertical: 2.8515625 }];
  let expectedFirstTCRS = [
    { horizontal: 659, vertical: 730 },
    { horizontal: 659, vertical: 730 }];

  for (const browserType of BROWSER) {
    describe(
      "Playwright Map Element Tests in " + browserType,
      () => {
        beforeAll(async () => {
          browser = await playwright[browserType].launch({
            headless: ISHEADLESS,
            slowMo: 50,
          });
          context = await browser.newContext();
          page = await context.newPage();
          if (browserType === "firefox") {
            await page.waitForNavigation();
          }
          await page.goto(PATH + "mapElement.html");
        });

        afterAll(async function () {
          await browser.close();
        });

        test("[" + browserType + "]" + " Initial map element extent", async () => {
          const extent = await page.$eval(
            "body > map",
            (map) => map.extent
          );

          expect(extent.projection).toEqual("CBMTILE");
          expect(extent.zoom).toEqual({ minZoom: 0, maxZoom: 25 });
          expect(extent.topLeft.pcrs).toEqual(expectedPCRS[0]);
          expect(extent.topLeft.gcrs).toEqual(expectedGCRS[0]);
          expect(extent.topLeft.tilematrix[0]).toEqual(expectedFirstTileMatrix[0]);
          expect(extent.topLeft.tcrs[0]).toEqual(expectedFirstTCRS[0]);
        });
        test("[" + browserType + "]" + " Panned and zoomed initial map's extent", async () => {
          await page.$eval(
            "body > map",
            (map) => map.zoomTo(81, -63, 1)
          );
          const extent = await page.$eval(
            "body > map",
            (map) => map.extent
          );

          expect(extent.zoom).toEqual({ minZoom: 0, maxZoom: 25 });
          expect(extent.topLeft.pcrs).toEqual(expectedPCRS[1]);
          expect(extent.topLeft.gcrs).toEqual(expectedGCRS[1]);
          expect(extent.topLeft.tilematrix[0]).toEqual(expectedFirstTileMatrix[1]);
          expect(extent.topLeft.tcrs[0]).toEqual(expectedFirstTCRS[1]);
        });
      }
    );
  }
})();