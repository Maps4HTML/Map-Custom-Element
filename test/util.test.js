/* global expect, M */

describe("M.Util Tests", () => {
  describe("M.parseStylesheetToHTML(mapml,base,container) utility function tests", () => {

    var mapmlString = "<mapml><head><style>.css {property:cool}</style></head><body></body></mapml>",
      parser = new DOMParser(),
      base = "https://example.org/mapml/is/awesome/",
      link = parser.parseFromString('<doc><link rel="stylesheet" href="./remote.css"/></doc>', 'application/xml').firstChild.firstChild;


    test("M.parseStylesheetToHTML(mapml,base,container)", () => {
      // in this test the mapml contains a <style>, but no <link rel=stylesheet> elements
      // base is a valid base
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      var testcontainer = document.createElement('div');
      M.parseStylesheetAsHTML(mapml, base, testcontainer);
      expect(testcontainer.querySelector('link')).toBeFalsy() &&
        expect(testcontainer.querySelector('style')).toBeTruthy() &&
        expect(testcontainer.querySelector('style').textContent).toEqual('.css {property:cool}');


    });

    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base, container)", () => {
      // in this test, we will create a link element in the mapml
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      var testcontainer = document.createElement('div');
      mapml.firstChild.firstChild.append(link);


      // we expect both the link and the inline style to be copied
      M.parseStylesheetAsHTML(mapml, base, testcontainer);
      expect(mapml.firstChild.firstChild.nodeName).toEqual("head") &&
        expect(testcontainer.querySelector('link')).toBeTruthy() &&
        expect(testcontainer.querySelector('style')).toBeTruthy() &&
        expect(testcontainer.querySelector('style').textContent).toEqual('.css {property:cool}') &&
        expect(testcontainer.querySelector('link').href).toEqual(base + "remote.css");

    });

    test("M.parseStylesheetToHTML(mapml with inline styles only, base, container)", () => {
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      M.parseStylesheetAsHTML(mapml, base, testcontainer);
      expect(testcontainer.querySelector('link')).toBeFalsy() &&
        expect(testcontainer.querySelector('style')).toBeTruthy() &&
        expect(testcontainer.querySelector('style').textContent).toEqual('.css {property:cool}');
    });
    test("M.parseStylesheetToHTML(mapml with linked, inline styles, valid base, container)", () => {
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      var testcontainer = document.createElement('div');
      mapml.firstChild.firstChild.append(base);
      mapml.firstChild.firstChild.append(link);

      M.parseStylesheetAsHTML(mapml, base, testcontainer);
      expect(testcontainer.querySelector('link')).toBeTruthy() &&
        expect(testcontainer.querySelector('style')).toBeTruthy() &&
        expect(testcontainer.querySelector('style').textContent).toEqual('.css {property:cool}') &&
        expect(testcontainer.querySelector('link').href).toEqual(base + "remote.css");
    });
    test("M.parseStylesheetToHTML(mapml with assorted linked, inline styles, valid base, container)", () => {
      var styleLinkTwo = parser.parseFromString('<doc><link rel="stylesheet" href="./styleTwo.css"/></doc>', 'application/xml').firstChild;
      var styleLinkThree = parser.parseFromString('<doc><link rel="stylesheet" href="./styleThree.css"/></doc>', 'application/xml').firstChild;
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      var testcontainer = document.createElement('div');
      mapml.firstChild.firstChild.append(link);
      mapml.firstChild.firstChild.append(styleLinkTwo);
      mapml.firstChild.firstChild.append(styleLinkThree);

      M.parseStylesheetAsHTML(mapml, base, testcontainer);

      expect(testcontainer.children[1].href).toEqual(base + "remote.css") &&
        expect(testcontainer.children[2].href).toEqual(base + "styleTwo.css") &&
        expect(testcontainer.children[3].href).toEqual(base + "styleThree.css") &&
        expect(testcontainer.children[0].textContent).toEqual('.css {property:cool}');

    });

    //base = null
    test("(null, null, null) should do nothing", () => {
      var check = M.parseStylesheetAsHTML(null, null, null)
      expect(check).toBeFalsy()
    });

    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base=null, container)", () => {
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      mapml.firstChild.firstChild.append(link);
      var check = M.parseStylesheetAsHTML(mapml, null, testcontainer);

      expect(testcontainer).toEqual(document.createElement('div')) &&
        expect(check).toBeFalsy();

    });

    test("M.parseStylesheetToHTML(mapml with assortedlinked, inline styles, null base, null container)", () => {
      var styleLinkTwo = parser.parseFromString('<doc><link rel="stylesheet" href="./styleTwo.css"/></doc>', 'application/xml').firstChild;
      var styleLinkThree = parser.parseFromString('<doc><link rel="stylesheet" href="./styleThree.css"/></doc>', 'application/xml').firstChild;
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      var testcontainer = document.createElement('div');
      mapml.firstChild.firstChild.append(link);
      mapml.firstChild.firstChild.append(styleLinkTwo);
      mapml.firstChild.firstChild.append(styleLinkThree);

      var check = M.parseStylesheetAsHTML(mapml, null, testcontainer);
      expect(testcontainer).toEqual(document.createElement('div')) &&
        expect(check).toBeFalsy()
    });

    //base = Element
    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base=Element with href='', container)", () => {
      var nullBase = parser.parseFromString('<doc><base href=""/></doc>', 'application/xml').firstChild;
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      mapml.firstChild.firstChild.append(nullBase);
      mapml.firstChild.firstChild.append(link);
      M.parseStylesheetAsHTML(mapml, nullBase, testcontainer)
      expect(testcontainer.querySelector('link').href).toEqual(document.URL + 'remote.css');
    });

    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base=Element with href=test.com, container)", () => {
      var testBase = parser.parseFromString('<doc><base href="http://test.com/"/></doc>', 'application/xml').firstChild.firstChild;
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      mapml.firstChild.firstChild.append(testBase);
      mapml.firstChild.firstChild.append(link);
      M.parseStylesheetAsHTML(mapml, testBase, testcontainer);
      expect(testcontainer.querySelector('link').href).toEqual('http://test.com/remote.css');
    });

    //base = random object
    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base= Object, container)", () => {
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");

      mapml.firstChild.firstChild.append(link);
      var check = M.parseStylesheetAsHTML(mapml, new Object, testcontainer);
      expect(testcontainer).toEqual(document.createElement('div')) &&
        expect(check).toBeFalsy();
    });

    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base=valid base, container = null)", () => {
      var testBase = parser.parseFromString('<doc><base href="http://test.com/"/></doc>', 'application/xml').firstChild.firstChild;
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");
      mapml.firstChild.firstChild.append(testBase);
      mapml.firstChild.firstChild.append(link);
      var check = M.parseStylesheetAsHTML(mapml, base, null);
      expect(testcontainer).toEqual(document.createElement('div')) &&
        expect(check).toBeFalsy();
    });

    test("M.parseStylesheetToHTML(mapml with linked, inline styles, base=valid base, container = non Element)", () => {
      var testcontainer = document.createElement('div');
      var mapml = parser.parseFromString(mapmlString, "application/xml");

      mapml.firstChild.firstChild.append(link);
      var check = M.parseStylesheetAsHTML(mapml, base, new Object);
      expect(testcontainer).toEqual(document.createElement('div')) &&
        expect(check).toBeFalsy();
    });
  });

  describe("M.coordsToArray(containerPoints) utility function tests", () => {

    /* test("Null input", () => {
      var output = M.coordsToArray(null);
      expect(output).toEqual([])
    });

    test("Array of numbers input", () => {
      var inputArray = [1, 2, 3, 4];

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([[1, 2], [3, 4]])
    });

    test("Single number array input", () => {
      var inputArray = [1];

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([])
    });

    test("Empty array input", () => {
      var inputArray = [];

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([])
    }); */

    test("Even number of input coords", () => {
      var inputArray = "1,2,3,4";

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([[1, 2], [3, 4]])
    });

    test("Odd number of input coords", () => {
      var inputArray = "1,2,3,4,5";

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([[1, 2], [3, 4]])
    });

    test("Single number input", () => {
      var inputArray = "1";

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([])
    });

    test("Empty string input", () => {
      var inputArray = "";

      var output = M.coordsToArray(inputArray);
      expect(output).toEqual([])
    });

  });
});

