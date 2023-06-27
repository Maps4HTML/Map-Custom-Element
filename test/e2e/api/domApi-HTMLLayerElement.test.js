import { test, expect, chromium } from '@playwright/test';

test.describe('HTMLLayerElement DOM API Tests', () => {
  let page;
  let context;
  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('');
    page =
      context.pages().find((page) => page.url() === 'about:blank') ||
      (await context.newPage());
    page = await context.newPage();
    await page.goto('domApi-HTMLLayerElement.html');
  });

  test.afterAll(async function () {
    await context.close();
  });
  test('Setting HTMLLayerElement.label sets the layer name per spec', async () => {
    let remoteWithTitleLabel = await page.evaluate(() => {
      return document.querySelector('#remote-with-title').label;
    });
    expect(remoteWithTitleLabel).toEqual('Unforsettable in every way');
    let remoteWithTitleName = await page.evaluate(() => {
      let layer = document.querySelector('#remote-with-title');
      return layer._layer.getName();
    });
    expect(remoteWithTitleName).toEqual(
      'MapML author-controlled name - unsettable'
    );

    let remoteNoTitleLabel = await page.evaluate(() => {
      return document.querySelector('#remote-no-title').label;
    });
    expect(remoteNoTitleLabel).toEqual('Bedtime For Bonzo');
    let remoteNoTitleName = await page.evaluate(() => {
      let layer = document.querySelector('#remote-no-title');
      return layer._layer.getName();
    });
    expect(remoteNoTitleName).toEqual(remoteNoTitleLabel);

    let localWithTitleLabel = await page.evaluate(() => {
      return document.querySelector('#local-with-title').label;
    });
    expect(localWithTitleLabel).toEqual('No dice, buddy!');
    let localWithTitleName = await page.evaluate(() => {
      let layer = document.querySelector('#local-with-title');
      return layer._layer.getName();
    });
    expect(localWithTitleName).not.toEqual(localWithTitleLabel);

    // THIS SHOULD NOT BE NECESSARY, BUT IT IS see comment below
    await page.waitForTimeout(500);
    let localNoTitleLabel = await page.evaluate(() => {
      return document.querySelector('#local-no-title').label;
    });
    expect(localNoTitleLabel).toEqual('Go ahead, make my day!');
    let localNoTitleName = await page.evaluate(() => {
      let layer = document.querySelector('#local-no-title');
      return layer._layer.getName();
    });
    // this isn't working, because waiting for the createmap event means
    // that the layer-._layer doesn't exist, so attributeChangeCallback on label
    // shortcircuits (does / can not setName on _layer) unless you wait for it.
    // need to ditch the createmap event!!
    expect(localNoTitleName).toEqual(localNoTitleLabel);
  });
  // add other tests here for HTMLLayerElement
});
