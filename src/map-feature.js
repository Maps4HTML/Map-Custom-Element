export class MapFeature extends HTMLElement {
  static get observedAttributes() {
    return ['zoom', 'min', 'max'];
  }

  get zoom() {
    return +(this.hasAttribute('zoom') ? this.getAttribute('zoom') : 0);
  }

  set zoom(val) {
    var parsedVal = parseInt(val, 10);
    if (!isNaN(parsedVal) && parsedVal >= this.min && parsedVal <= this.max) {
      this.setAttribute('zoom', parsedVal);
    }
  }

  get min() {
    // fallback: the minimum zoom bound of layer- element
    return +(this.hasAttribute('min')
      ? this.getAttribute('min')
      : this._layer._layerEl.extent.zoom.minZoom);
  }

  set min(val) {
    var parsedVal = parseInt(val, 10);
    if (!isNaN(parsedVal)) {
      if (
        parsedVal >= this._layer._layerEl.extent.zoom.minZoom &&
        parsedVal <= this._layer._layerEl.extent.zoom.maxZoom
      ) {
        this.setAttribute('min', parsedVal);
      } else {
        this.setAttribute('min', this._layer._layerEl.extent.zoom.minZoom);
      }
    }
  }

  get max() {
    // fallback: the maximum zoom bound of layer- element
    return +(this.hasAttribute('max')
      ? this.getAttribute('max')
      : this._layer._layerEl.extent.zoom.maxZoom);
  }

  set max(val) {
    var parsedVal = parseInt(val, 10);
    if (!isNaN(parsedVal)) {
      if (
        parsedVal >= this._layer._layerEl.extent.zoom.minZoom &&
        parsedVal <= this._layer._layerEl.extent.zoom.maxZoom
      ) {
        this.setAttribute('max', parsedVal);
      } else {
        this.setAttribute('max', this._layer._layerEl.extent.zoom.maxZoom);
      }
    }
  }

  get extent() {
    if (this.isConnected) {
      // if the feature extent is the first time to be calculated or the feature extent is changed (by changing
      // the innertext of map-coordinates), then calculate feature extent by invoking the getFeatureExtent function
      if (!this._getFeatureExtent) {
        this._getFeatureExtent = this._memoizeExtent();
      }
      return this._getFeatureExtent();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'zoom': {
        if (oldValue !== newValue && this._layer) {
          let layer = this._layer,
            zoom = newValue,
            mapmlvectors = layer._mapmlvectors;
          // if the vector layer only has static features, should update zoom bounds when zoom attribute is changed
          if (mapmlvectors._staticFeature) {
            this._removeInFeatureList(oldValue);
            if (zoom in mapmlvectors._features) {
              mapmlvectors._features[zoom].push(this._featureGroup);
            } else {
              mapmlvectors._features[zoom] = [this._featureGroup];
            }
            let native = this._getNativeZoomAndCS(layer._content);
            mapmlvectors.zoomBounds = M.getZoomBounds(
              layer._content,
              native.zoom
            );
          }
        }
        break;
      }
    }
  }

  constructor() {
    // Always call super first in constructor
    super();
  }

  connectedCallback() {
    this._parentEl =
      this.parentNode.nodeName.toUpperCase() === 'LAYER-' ||
      this.parentNode.nodeName.toUpperCase() === 'MAP-EXTENT'
        ? this.parentNode
        : this.parentNode.host;
    this._parentEl.whenReady().then(() => {
      this._layer = this._parentEl._layer;
      if (
        this._layer._layerEl.hasAttribute('data-moving') ||
        this._parentEl.hasAttribute('data-moving')
      )
        return;
      // if mapFeature element is not connected to layer- or layer-'s shadowroot,
      // or the parent layer- element has a "data-moving" attribute
      if (
        (this.parentNode.nodeType !== document.DOCUMENT_FRAGMENT_NODE &&
          this.parentNode.nodeName.toLowerCase() !== 'layer-') ||
        (this.parentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE &&
          this.parentNode.host.hasAttribute('data-moving')) ||
        (this.parentNode.nodeName.toLowerCase() === 'layer-' &&
          this.parentNode.hasAttribute('data-moving'))
      ) {
        return;
      }
      // set up the map-feature object properties
      this._addFeature();
      // use observer to monitor the changes in mapFeature's subtree
      // (i.e. map-properties, map-featurecaption, map-coordinates)
      this._observer = new MutationObserver((mutationList) => {
        for (let mutation of mutationList) {
          // the attributes changes of <map-feature> element should be handled by attributeChangedCallback()
          if (mutation.type === 'attributes' && mutation.target === this) {
            return;
          }
          // re-render feature if there is any observed change
          this._reRender();
        }
      });
      this._observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true
      });
    });
  }

  disconnectedCallback() {
    if (!this._layer) return;
    if (this._layer._layerEl.hasAttribute('data-moving')) return;
    this._removeFeature();
    this._observer.disconnect();
  }

  _reRender() {
    if (this._groupEl.isConnected) {
      let native = this._getNativeZoomAndCS(this._layer._content);
      let placeholder = document.createElement('span');
      this._groupEl.insertAdjacentElement('beforebegin', placeholder);

      this._featureGroup._map.removeLayer(this._featureGroup);
      // Garbage collection needed
      this._featureGroup = this._layer._mapmlvectors
        .addData(this, native.cs, native.zoom)
        .addTo(this._map);
      placeholder.replaceWith(this._featureGroup.options.group);
      // TODO: getBounds() should dynamically update the layerBounds and zoomBounds
      this._layer._setLayerElExtent();
      delete this._getFeatureExtent;
      this._setUpEvents();
    }
  }

  _removeFeature() {
    // if the <layer- > el is disconnected
    // the <g> el has already got removed at this point
    if (this._groupEl?.isConnected) {
      this._groupEl.remove();
    }
    // if the <layer- > el has already been disconnected,
    // then _map.removeLayer(layerEl._layer) has already been invoked (inside layerEl.disconnectedCallback())
    // this._featureGroup has already got removed at this point
    if (this._featureGroup?._map) {
      this._featureGroup._map.removeLayer(this._featureGroup);
      let mapmlvectors = this._layer._mapmlvectors;
      if (mapmlvectors) {
        if (mapmlvectors._staticFeature) {
          if (mapmlvectors._features[this.zoom]) {
            this._removeInFeatureList(this.zoom);
          }
          let container = this._layer.shadowRoot || this._layer._layerEl;
          // update zoom bounds of vector layer
          mapmlvectors.zoomBounds = M.getZoomBounds(
            this._layer._content,
            this._getNativeZoomAndCS(this._layer._content).zoom
          );
        }
        mapmlvectors.options.properties = null;
        delete mapmlvectors._layers[this._featureGroup._leaflet_id];
      }
    }
    delete this._featureGroup;
    delete this._groupEl;
    // ensure that feature extent can be re-calculated everytime that map-feature element is updated / re-added
    if (this._getFeatureExtent) delete this._getFeatureExtent;
  }

  _addFeature() {
    this._parentEl.whenReady().then(() => {
      let parentLayer =
        this._parentEl.nodeName.toUpperCase() === 'LAYER-'
          ? this._parentEl
          : this._parentEl.parentElement || this._parentEl.parentNode.host;
      this._map = this._layer._map;
      let mapmlvectors = this._layer._mapmlvectors;
      // "synchronize" the event handlers between map-feature and <g>
      if (!this.querySelector('map-geometry')) return;
      if (!this._extentEl) {
        let native = this._getNativeZoomAndCS(this._layer._content);
        this._featureGroup = mapmlvectors.addData(this, native.cs, native.zoom);
        if (parentLayer.checked) {
          this._featureGroup.addTo(this._map);
        }
        mapmlvectors._layers[this._featureGroup._leaflet_id] =
          this._featureGroup;
        if (mapmlvectors._staticFeature && !this._extentEl) {
          // update zoom bounds of vector layer
          mapmlvectors.zoomBounds = M.getZoomBounds(
            this._layer._content,
            this._getNativeZoomAndCS(this._layer._content).zoom
          );
          // todo: dynamically update layer bounds of vector layer
          mapmlvectors.layerBounds = M.getBounds(this._layer._content);
          // update map's zoom limit
          this._map._addZoomLimit(mapmlvectors);
          // TODO: can be set as a handler of featureLayer
          mapmlvectors._resetFeatures();
          L.extend(mapmlvectors.options, mapmlvectors.zoomBounds);
        }
      }

      if (Object.keys(mapmlvectors._layers).length === 1) {
        this._layer._setLayerElExtent();
      }
      this._setUpEvents();
    });
  }

  _setUpEvents() {
    ['click', 'focus', 'blur', 'keyup', 'keydown'].forEach((name) => {
      // when <g> is clicked / focused / blurred
      // should dispatch the click / focus / blur event listener on **linked HTMLFeatureElements**
      this._groupEl.addEventListener(name, (e) => {
        if (name === 'click') {
          // dispatch a cloned mouseevent to trigger the click event handlers set on HTMLFeatureElement
          let clickEv = new PointerEvent(name, { cancelable: true });
          clickEv.originalEvent = e;
          this.dispatchEvent(clickEv);
        } else if (name === 'keyup' || name === 'keydown') {
          let keyEv = new KeyboardEvent(name, { cancelable: true });
          keyEv.originalEvent = e;
          this.dispatchEvent(keyEv);
        } else {
          // dispatch a cloned focusevent to trigger the focus/blue event handlers set on HTMLFeatureElement
          let focusEv = new FocusEvent(name, { cancelable: true });
          focusEv.originalEvent = e;
          this.dispatchEvent(focusEv);
        }
      });
    });
  }

  _getNativeZoomAndCS(content) {
    // content: referred to <layer- > if the <layer- > has inline <map-extent>, <map-feature> or <map-tile>
    //          referred to remote mapml if the <layer- > has a src attribute, and the fetched mapml contains <map-feature>
    //          referred to [map-meta, ...] if it is query
    //          referred to null otherwise (i.e. <layer- > has fetched <map-extent> in shadow, the <map-feature> attaches to <map-extent>'s shadow)
    let nativeZoom, nativeCS;
    if (this._extentEl) {
      // feature attaches to extent's shadow
      if (this._extentEl.querySelector('map-link[rel=query]')) {
        // for query, fallback zoom is the current map zoom level that the query is returned
        let metaZoom, metaCS;
        if (content) {
          metaZoom = M._metaContentToObject(
            Array.prototype.filter
              .call(content, function (elem) {
                return elem.matches('map-meta[name=zoom]');
              })[0]
              ?.getAttribute('content')
          ).content;
          metaCS = M._metaContentToObject(
            Array.prototype.filter
              .call(content, function (elem) {
                return elem.matches('map-meta[name=cs]');
              })[0]
              ?.getAttribute('content')
          ).content;
        }
        nativeZoom = metaZoom || this._map.getZoom();
        nativeCS = metaCS || 'gcrs';
      } else if (this._extentEl.querySelector('map-link[rel=features]')) {
        // for templated feature, read fallback from the fetched mapml's map-meta[name=zoom / cs]
        nativeZoom = this._extentEl._nativeZoom;
        nativeCS = this._extentEl._nativeCS;
      }
      return { zoom: nativeZoom, cs: nativeCS };
    } else {
      // feature attaches to layer- or layer-'s shadow
      if (content.nodeType === Node.DOCUMENT_NODE) {
        // for features migrated from mapml, read native zoom and cs from the remote mapml
        return M.getNativeVariables(content);
      } else if (content.nodeName.toUpperCase() === 'LAYER-') {
        // for inline features, read native zoom and cs from inline map-meta
        let zoomMeta = this._parentEl.querySelectorAll('map-meta[name=zoom]'),
          zoomLength = zoomMeta?.length;
        nativeZoom = zoomLength
          ? +zoomMeta[zoomLength - 1]
              .getAttribute('content')
              ?.split(',')
              .find((str) => str.includes('value'))
              ?.split('=')[1]
          : 0;

        let csMeta = this._parentEl.querySelectorAll('map-meta[name=cs]'),
          csLength = csMeta?.length;
        nativeCS = csLength
          ? csMeta[csLength - 1].getAttribute('content')
          : 'gcrs';
        return { zoom: nativeZoom, cs: nativeCS };
      }
    }
  }

  // Util functions:
  // internal method to calculate the extent of the feature and store it in cache for the first time
  // and return cache when feature's extent is repeatedly requested
  // for .extent
  _memoizeExtent() {
    // memoize calculated extent
    let extentCache;
    return function () {
      if (extentCache && this._getFeatureExtent) {
        // if the extent has already been calculated and is not updated, return stored extent
        return extentCache;
      } else {
        // calculate feature extent
        let map = this._map,
          geometry = this.querySelector('map-geometry'),
          native = this._getNativeZoomAndCS(
            this._layer._content || this._layer.metas
          ),
          cs = geometry.getAttribute('cs') || native.cs,
          // zoom level that the feature rendered at
          zoom = this.zoom || native.zoom,
          shapes = geometry.querySelectorAll(
            'map-point, map-linestring, map-polygon, map-multipoint, map-multilinestring'
          ),
          bboxExtent = [
            Infinity,
            Infinity,
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY
          ];
        for (let shape of shapes) {
          let coord = shape.querySelectorAll('map-coordinates');
          for (let i = 0; i < coord.length; ++i) {
            bboxExtent = _updateExtent(shape, coord[i], bboxExtent);
          }
        }
        let topLeft = L.point(bboxExtent[0], bboxExtent[1]);
        let bottomRight = L.point(bboxExtent[2], bboxExtent[3]);
        let pcrsBound = M.boundsToPCRSBounds(
          L.bounds(topLeft, bottomRight),
          zoom,
          map.options.projection,
          cs
        );
        if (
          shapes.length === 1 &&
          shapes[0].tagName.toUpperCase() === 'MAP-POINT'
        ) {
          let projection = map.options.projection,
            maxZoom = this.hasAttribute('max')
              ? +this.getAttribute('max')
              : M[projection].options.resolutions.length - 1,
            tileCenter = M[projection].options.crs.tile.bounds.getCenter(),
            pixel = M[projection].transformation.transform(
              pcrsBound.min,
              M[projection].scale(+this.zoom || maxZoom)
            );
          pcrsBound = M.pixelToPCRSBounds(
            L.bounds(pixel.subtract(tileCenter), pixel.add(tileCenter)),
            this.zoom || maxZoom,
            projection
          );
        }
        let result = Object.assign(
          M._convertAndFormatPCRS(
            pcrsBound,
            map.options.crs,
            map.options.projection
          )
        );
        // memoize calculated result
        extentCache = result;
        return result;
      }
    };

    // update the bboxExtent
    function _updateExtent(shape, coord, bboxExtent) {
      let data = coord.innerHTML
        .trim()
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .split(/[<>\ ]/g);
      switch (shape.tagName) {
        case 'MAP-POINT':
          bboxExtent = M._updateExtent(bboxExtent, +data[0], +data[1]);
          break;
        case 'MAP-LINESTRING':
        case 'MAP-POLYGON':
        case 'MAP-MULTIPOINT':
        case 'MAP-MULTILINESTRING':
          for (let i = 0; i < data.length; i += 2) {
            bboxExtent = M._updateExtent(bboxExtent, +data[i], +data[i + 1]);
          }
          break;
        default:
          break;
      }
      return bboxExtent;
    }
  }

  // find and remove the feature from mapmlvectors._features if vector layer only contains static features, helper function
  //      prevent it from being rendered again when zooming in / out (mapmlvectors.resetFeature() is invoked)
  // TODO: Can be moved to FeatureLayer.js, pass in leaflet id for layer to remove
  _removeInFeatureList(zoom) {
    if (zoom === null) {
      return;
    }
    let mapmlvectors = this._layer._mapmlvectors;
    for (let i = 0; i < mapmlvectors._features[zoom].length; ++i) {
      let feature = mapmlvectors._features[zoom][i];
      if (feature._leaflet_id === this._featureGroup._leaflet_id) {
        mapmlvectors._features[zoom].splice(i, 1);
        break;
      }
    }
  }

  getMaxZoom() {
    let tL = this.extent.topLeft.pcrs,
      bR = this.extent.bottomRight.pcrs,
      bound = L.bounds(
        L.point(tL.horizontal, tL.vertical),
        L.point(bR.horizontal, bR.vertical)
      );
    let projection = this._map.options.projection,
      layerZoomBounds = this._layer._layerEl.extent.zoom,
      minZoom = layerZoomBounds.minZoom ? layerZoomBounds.minZoom : 0,
      maxZoom = layerZoomBounds.maxZoom
        ? layerZoomBounds.maxZoom
        : M[projection].options.resolutions.length - 1;
    let newZoom;
    if (this.hasAttribute('zoom')) {
      // if there is a zoom attribute set to the map-feature, zoom to the zoom attribute value
      newZoom = this.zoom;
    } else {
      // if not, calculate the maximum zoom level that can show the feature completely
      newZoom = M.getMaxZoom(bound, this._map, minZoom, maxZoom);
      if (this.max < newZoom) {
        // if the calculated zoom is greater than the value of max zoom attribute, go with max zoom attribute
        newZoom = this.max;
      } else if (this.min > newZoom) {
        // if the calculated zoom is less than the value of min zoom attribute, go with min zoom attribute
        newZoom = this.min;
      }
    }
    // prevent overzooming / underzooming
    if (newZoom < minZoom) {
      newZoom = minZoom;
    } else if (newZoom > maxZoom) {
      newZoom = maxZoom;
    }

    // should check whether the extent after zooming falls into the templated extent bound
    return newZoom;
  }

  // internal support for returning a GeoJSON representation of <map-feature> geometry
  // The options object can contain the following:
  //      propertyFunction   - function(<map-properties>), A function that maps the features' <map-properties> element to a GeoJSON "properties" member.
  //      transform          - Bool, Transform coordinates to gcrs values, defaults to True
  // mapml2geojson: <map-feature> Object -> GeoJSON
  mapml2geojson(options) {
    let defaults = {
      propertyFunction: null,
      transform: true
    };
    // assign default values for undefined options
    options = Object.assign({}, defaults, options);

    let json = {
      type: 'Feature',
      properties: {},
      geometry: {}
    };
    let el = this.querySelector('map-properties');
    if (!el) {
      json.properties = null;
    } else if (typeof options.propertyFunction === 'function') {
      json.properties = options.propertyFunction(el);
    } else if (el.querySelector('table')) {
      // setting properties when table presented
      let table = el.querySelector('table').cloneNode(true);
      json.properties = M._table2properties(table);
    } else {
      // when no table present, strip any possible html tags to only get text
      json.properties = {
        prop0: el.innerHTML.replace(/(<([^>]+)>)/gi, '').replace(/\s/g, '')
      };
    }

    // transform to gcrs if options.transform = true (default)
    let source = null,
      dest = null;
    if (options.transform) {
      source = new proj4.Proj(this._map.options.crs.code);
      dest = new proj4.Proj('EPSG:4326');
      if (
        this._map.options.crs.code === 'EPSG:3857' ||
        this._map.options.crs.code === 'EPSG:4326'
      ) {
        options.transform = false;
      }
    }

    let collection = this.querySelector('map-geometry').querySelector(
        'map-geometrycollection'
      ),
      shapes = this.querySelector('map-geometry').querySelectorAll(
        'map-point, map-polygon, map-linestring, map-multipoint, map-multipolygon, map-multilinestring'
      );

    if (collection) {
      json.geometry.type = 'GeometryCollection';
      json.geometry.geometries = [];
      for (let shape of shapes) {
        json.geometry.geometries.push(
          M._geometry2geojson(shape, source, dest, options.transform)
        );
      }
    } else {
      json.geometry = M._geometry2geojson(
        shapes[0],
        source,
        dest,
        options.transform
      );
    }
    return json;
  }

  // a method that simulates a click, or invoking the user-defined click event
  click() {
    let g = this._groupEl,
      rect = g.getBoundingClientRect();
    let event = new MouseEvent('click', {
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      button: 0
    });
    let properties = this.querySelector('map-properties');
    if (g.getAttribute('role') === 'link') {
      for (let path of g.children) {
        path.mousedown.call(this._featureGroup, event);
        path.mouseup.call(this._featureGroup, event);
      }
    }
    // dispatch click event for map-feature to allow events entered by 'addEventListener'
    let clickEv = new PointerEvent('click', { cancelable: true });
    clickEv.originalEvent = event;
    this.dispatchEvent(clickEv);
    // for custom projection, layer- element may disconnect and re-attach to the map after the click
    // so check whether map-feature element is still connected before any further operations
    if (properties && this.isConnected) {
      let featureGroup = this._featureGroup,
        shapes = featureGroup._layers;
      // close popup if the popup is currently open
      for (let id in shapes) {
        if (shapes[id].isPopupOpen()) {
          shapes[id].closePopup();
        }
      }
      if (featureGroup.isPopupOpen()) {
        featureGroup.closePopup();
      } else if (!clickEv.originalEvent.cancelBubble) {
        // If stopPropagation is not set on originalEvent by user
        featureGroup.openPopup();
      }
    }
  }

  // a method that sets the current focus to the <g> element, or invoking the user-defined focus event
  //      options (optional): as options parameter for native HTMLElement
  //                          https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus
  focus(options) {
    this._groupEl.focus(options);
  }

  // a method that makes the <g> element lose focus, or invoking the user-defined blur event
  blur() {
    if (
      document.activeElement.shadowRoot?.activeElement === this._groupEl ||
      document.activeElement.shadowRoot?.activeElement.parentNode ===
        this._groupEl
    ) {
      this._groupEl.blur();
      // set focus to the map container
      this._map._container.focus();
    }
  }

  // a method that can the viewport to be centred on the feature's extent
  zoomTo() {
    let extent = this.extent,
      map = this._map;
    let tL = extent.topLeft.pcrs,
      bR = extent.bottomRight.pcrs,
      bound = L.bounds(
        L.point(tL.horizontal, tL.vertical),
        L.point(bR.horizontal, bR.vertical)
      ),
      center = map.options.crs.unproject(bound.getCenter(true));
    map.setView(center, this.getMaxZoom(), { animate: false });
  }
  whenReady() {
    return this._parentEl.whenReady().then(() => {
      return new Promise((resolve, reject) => {
        let interval, failureTimer;
        if (this._featureGroup) {
          resolve();
        } else {
          let featureElement = this;
          interval = setInterval(testForFeature, 200, featureElement);
          failureTimer = setTimeout(featureNotDefined, 5000);
        }
        function testForFeature(featureElement) {
          if (featureElement._featureGroup) {
            clearInterval(interval);
            clearTimeout(failureTimer);
            resolve();
          }
        }
        function featureNotDefined() {
          clearInterval(interval);
          clearTimeout(failureTimer);
          reject('Timeout reached waiting for feature to be ready');
        }
      });
    });
  }
}
