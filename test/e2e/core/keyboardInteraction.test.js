const playwright = require("playwright");
jest.setTimeout(50000);
(async () => {
  for (const browserType of BROWSER) {
    describe(
      "Playwright Keyboard Navigation + Query Layer Tests in " + browserType,
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
          await page.goto(PATH + "keyboardInteraction.html");
        });

        afterAll(async function () {
          await browser.close();
        });
        describe("Crosshair Tests in " + browserType, () => {
          test("[" + browserType + "]" + " Crosshair hidden onload, shows on focus", async () => {
            const beforeTabHidden = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);
            await page.keyboard.press("Tab");
            const afterTab = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);
            expect(beforeTabHidden).toEqual("hidden");
            expect(afterTab).toEqual("");
          });

          test("[" + browserType + "]" + " Crosshair remains on map move with arrow keys + space", async () => {
            await page.keyboard.press("ArrowUp");
            await page.waitForTimeout(500);
            await page.keyboard.press("ArrowDown");
            await page.waitForTimeout(500);
            await page.keyboard.press("ArrowLeft");
            await page.waitForTimeout(500);
            await page.keyboard.press("ArrowRight");
            await page.waitForTimeout(500);
            await page.keyboard.press(" ")
            await page.waitForTimeout(500);
            const afterMove = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);
            expect(afterMove).toEqual("");
          });

          test("[" + browserType + "]" + " Crosshair hidden on esc + tab out", async () => {
            await page.keyboard.press("Escape");
            const afterEsc = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);
            await page.keyboard.press("ArrowUp");

            await page.keyboard.press("Tab");
            const afterTab = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);

            expect(afterEsc).toEqual("hidden");
            expect(afterTab).toEqual("hidden");
          });

          test("[" + browserType + "]" + " Crosshair hidden when queryable layer is unselected, shows on reselect", async () => {
            await page.click("body > mapml-viewer");
            await page.keyboard.press("ArrowUp");
            await page.evaluateHandle(() => document.querySelector("layer-").removeAttribute("checked"));
            const afterUncheck = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);

            await page.evaluateHandle(() => document.querySelector("layer-").setAttribute("checked", ""));
            const afterCheck = await page.$eval("div > div.mapml-crosshair", (div) => div.style.visibility);

            expect(afterUncheck).toEqual("hidden");
            expect(afterCheck).toEqual("");
          });
        });
        describe("Tab Navigable Tests in " + browserType, () => {
          function findFocusedNode(node) {
            if (node.focused)
              return node;
            for (const child of node.children || []) {
              const foundNode = findFocusedNode(child);
              return foundNode;
            }
            return null;
          }
          test("[" + browserType + "]" + " Tab focuses inline features", async () => {
            await page.click("div > div.leaflet-control-container > div.leaflet-top.leaflet-left > div.mapml-reload-button.leaflet-bar.leaflet-control > a");
            await page.waitForTimeout(1000);
            await page.click("body > mapml-viewer");
            await page.keyboard.press("Escape");

            await page.keyboard.press("Tab");
            const aHandle = await page.evaluateHandle(() => document.querySelector("mapml-viewer"));
            const nextHandle = await page.evaluateHandle(doc => doc.shadowRoot, aHandle);
            const resultHandle = await page.evaluateHandle(root => root.activeElement, nextHandle);
            const focused = await (await page.evaluateHandle(elem => elem.getAttribute("d"), resultHandle)).jsonValue();

            await page.keyboard.press("Tab");
            const aHandleNext = await page.evaluateHandle(() => document.querySelector("mapml-viewer"));
            const nextHandleNext = await page.evaluateHandle(doc => doc.shadowRoot, aHandleNext);
            const resultHandleNext = await page.evaluateHandle(root => root.activeElement, nextHandleNext);
            const focusedNext = await (await page.evaluateHandle(elem => elem.getAttribute("d"), resultHandleNext)).jsonValue();

            expect(focused).toEqual("M330 83L553 83L553 339L330 339z");
            expect(focusedNext).toEqual("M-53 451L153 508L113 146L-53 191z");
          });

          test("[" + browserType + "]" + " Tab focuses fetched features", async () => {
            await page.evaluateHandle(() => document.getElementById("vector").setAttribute("checked", ""));
            await page.click("body > mapml-viewer");
            await page.keyboard.press("Escape");

            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            const aHandle = await page.evaluateHandle(() => document.querySelector("mapml-viewer"));
            const nextHandle = await page.evaluateHandle(doc => doc.shadowRoot, aHandle);
            const resultHandle = await page.evaluateHandle(root => root.activeElement, nextHandle);
            const focused = await (await page.evaluateHandle(elem => elem.getAttribute("d"), resultHandle)).jsonValue();

            await page.keyboard.press("Tab");
            const aHandleNext = await page.evaluateHandle(() => document.querySelector("mapml-viewer"));
            const nextHandleNext = await page.evaluateHandle(doc => doc.shadowRoot, aHandleNext);
            const resultHandleNext = await page.evaluateHandle(root => root.activeElement, nextHandleNext);
            const focusedNext = await (await page.evaluateHandle(elem => elem.getAttribute("d"), resultHandleNext)).jsonValue();

            expect(focused).toEqual("M190 357L203 355L209 374L213 379L211 380L213 391L193 393L193 395L195 396L194 400L191 399L191 397L189 398L189 400L187 400L185 386L184 357z");
            expect(focusedNext).toEqual("M-30 139L-29 138L-31 140zM-30 136L-29 138L-31 138zM-29 126L-28 127L-30 127zM-32 125L-30 131L-32 137L-31 138L-34 141L-34 138L-36 136L-36 139L-37 136L-34 132L-35 131L-33 126zM-36 130L-35 131L-37 132zM-31 121L-30 120L-28 122L-28 127L-31 125L-31 121zM-33 123L-34 122L-32 120L-31 124L-32 123L-35 126L-35 124zM-36 123L-37 124L-37 118L-35 113L-32 114L-34 120zM-27 110L-26 115L-27 114L-28 118L-32 119L-33 118L-30 115L-27 108zM-36 113L-36 114zM-33 106L-29 110L-31 112L-31 115L-33 111L-34 113L-35 112L-35 108L-33 105zM3 6L7 13L11 15L13 23L-37 80L-35 84L-31 85L-33 86L-33 99L-29 99L-27 97L-22 98L-22 117L-24 128L-20 136L-23 142L-28 144L-29 143L-26 140L-29 139L-30 136L-28 135L-30 136L-30 134L-28 132L-30 132L-26 127L-28 120L-26 117L-27 107L-25 102L-29 109L-29 103L-31 100L-31 106L-35 103L-36 92L-38 89L-34 86L-38 86L-40 84L-43 77L-48 74L-48 69L-50 69L-50 66L-53 64L-50 65L-50 60L-53 58L-53 -20L-49 -17L-53 -14L-47 -7L-48 -10L-45 -14L-44 -13L-47 -9L-43 -12L-45 -18L-42 -20L-40 -31L-36 -31L-33 -26L-30 -25L-19 -26L-20 -25L-18 -23L-13 -23L-12 -20L-5 -18L-4 -15L-7 -14L-5 -14L-5 -11L-1 -7L-3 -6L-2 -2L2 1L3 5z");
          });
        });
      }
    );
  }
})();