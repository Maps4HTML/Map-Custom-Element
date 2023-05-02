import { test, expect, chromium } from '@playwright/test';

const isVisible = require('./general/isVisible');
const zoomLimit = require('./general/zoomLimit');
const extentProperty = require('./general/extentProperty');

let expectedPCRS = {
    topLeft: {
      horizontal: -180,
      vertical: 90
    },
    bottomRight: {
      horizontal: 180,
      vertical: -270
    }
  },
  expectedGCRS = {
    topLeft: {
      horizontal: -180,
      vertical: 90
    },
    bottomRight: {
      horizontal: 180,
      vertical: -270
    }
  };

test.describe('Playwright mapMLTemplatedTile Layer Tests', () => {
  isVisible.test('templatedTileLayer.html', 2, 2);
  zoomLimit.test('templatedTileLayer.html', 1, 0);
  extentProperty.test('templatedTileLayer.html', expectedPCRS, expectedGCRS);
  test.describe('General Tests ', () => {
    let page;
    let context;
    test.beforeAll(async () => {
      context = await chromium.launchPersistentContext('');
      page =
        context.pages().find((page) => page.url() === 'about:blank') ||
        (await context.newPage());
      await page.goto('templatedTileLayer.html');
    });

    test.afterAll(async function () {
      await context.close();
    });

    test('SVG tiles load in on default map zoom level', async () => {
      const tiles = await page.$eval(
        'xpath=//html/body/map/div >> css=div > div.leaflet-pane.leaflet-map-pane > div.leaflet-pane.leaflet-overlay-pane > div:nth-child(1) > div.leaflet-layer.mapml-templatedlayer-container > div > div',
        (tileGroup) => tileGroup.getElementsByTagName('svg').length
      );
      expect(tiles).toEqual(8);
    });

    test('Templated tile layer works without <map-input> for zoom level', async () => {
      // tests fix for https://github.com/Maps4HTML/Web-Map-Custom-Element/issues/669
      await page.hover(
        'div > div.leaflet-control-container > div.leaflet-top.leaflet-right > div'
      );
      const layerCount = await page.$eval(
        'div > div.leaflet-control-container > div.leaflet-top.leaflet-right > div > section > div.leaflet-control-layers-overlays',
        (el) => el.children.length
      );
      expect(layerCount).toEqual(3);
    });
  });
});
