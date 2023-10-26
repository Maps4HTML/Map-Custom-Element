export var LayerControl = L.Control.Layers.extend({
  /* removes 'base' layers as a concept */
  options: {
    autoZIndex: false,
    sortLayers: true,
    sortFunction: function (layerA, layerB) {
      return layerA.options.zIndex < layerB.options.zIndex
        ? -1
        : layerA.options.zIndex > layerB.options.zIndex
        ? 1
        : 0;
    }
  },
  initialize: function (overlays, options) {
    L.setOptions(this, options);

    // the _layers array contains objects like {layer: layer, name: "name", overlay: true}
    // the array index is the id of the layer returned by L.stamp(layer) which I guess is a unique hash
    this._layerControlInputs = [];
    this._layers = [];
    this._lastZIndex = 0;
    this._handlingClick = false;

    for (var i in overlays) {
      this._addLayer(overlays[i], i, true);
    }
  },
  onAdd: function () {
    this._initLayout();
    // this._map.on('validate', this._validateInput, this);
    // L.DomEvent.on(this.options.mapEl, 'layerchange', this._validateInput, this);
    // Adding event on layer control button
    L.DomEvent.on(
      this._container.getElementsByTagName('a')[0],
      'keydown',
      this._focusFirstLayer,
      this._container
    );
    L.DomEvent.on(
      this._container,
      'contextmenu',
      this._preventDefaultContextMenu,
      this
    );
    this._update();
    //this._validateExtents();
    if (this._layers.length < 1 && !this._map._showControls) {
      this._container.setAttribute('hidden', '');
    } else {
      this._map._showControls = true;
    }
    return this._container;
  },
  onRemove: function (map) {
    // map.off('validate', this._validateInput, this);
    L.DomEvent.off(
      this._container.getElementsByTagName('a')[0],
      'keydown',
      this._focusFirstLayer,
      this._container
    );
    // remove layer-registerd event handlers so that if the control is not
    // on the map it does not generate layer events
    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].layer.off('add remove', this._onLayerChange, this);
    }
  },
  addOrUpdateOverlay: function (layer, name) {
    var alreadyThere = false;
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i].layer === layer) {
        alreadyThere = true;
        this._layers[i].name = name;
        // replace the controls with updated controls if necessary.
        break;
      }
    }
    if (!alreadyThere) {
      this.addOverlay(layer, name);
    }
    if (this._layers.length > 0) {
      this._container.removeAttribute('hidden');
      this._map._showControls = true;
    }
    return this._map ? this._update() : this;
  },
  removeLayer: function (layer) {
    L.Control.Layers.prototype.removeLayer.call(this, layer);
    if (this._layers.length === 0) {
      this._container.setAttribute('hidden', '');
    }
  },

  _checkDisabledLayers: function () {},

  // focus the first layer in the layer control when enter is pressed
  _focusFirstLayer: function (e) {
    if (
      e.key === 'Enter' &&
      this.className ===
        'leaflet-control-layers leaflet-control leaflet-control-layers-expanded'
    ) {
      var elem =
        this.children[1].children[2].children[0].children[0].children[0]
          .children[0];
      if (elem) setTimeout(() => elem.focus(), 0);
    }
  },

  _withinZoomBounds: function (zoom, range) {
    return range.min <= zoom && zoom <= range.max;
  },
  _addItem: function (obj) {
    var layercontrols = obj.layer._layerEl._createLayerControlHTML();
    // the input is required by Leaflet...
    obj.input = layercontrols.querySelector(
      'input.leaflet-control-layers-selector'
    );

    this._layerControlInputs.push(obj.input);
    obj.input.layerId = L.stamp(obj.layer);

    L.DomEvent.on(obj.input, 'click', this._onInputClick, this);
    this._overlaysList.appendChild(layercontrols);
    return layercontrols;
  },

  //overrides collapse and conditionally collapses the panel
  collapse: function (e) {
    if (
      e.target.tagName === 'SELECT' ||
      (e.relatedTarget &&
        e.relatedTarget.parentElement &&
        (e.relatedTarget.className === 'mapml-contextmenu mapml-layer-menu' ||
          e.relatedTarget.parentElement.className ===
            'mapml-contextmenu mapml-layer-menu')) ||
      (this._map && this._map.contextMenu._layerMenu.style.display === 'block')
    )
      return this;

    L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
    if (e.originalEvent?.pointerType === 'touch') {
      this._container._isExpanded = false;
    }
    return this;
  },
  _preventDefaultContextMenu: function (e) {
    let latlng = this._map.mouseEventToLatLng(e);
    let containerPoint = this._map.mouseEventToContainerPoint(e);
    e.preventDefault();
    // for touch devices, when the layer control is not expanded,
    // the layer context menu should not show on map
    if (!this._container._isExpanded && e.pointerType === 'touch') {
      this._container._isExpanded = true;
      return;
    }
    this._map.fire('contextmenu', {
      originalEvent: e,
      containerPoint: containerPoint,
      latlng: latlng
    });
  }
});
export var layerControl = function (layers, options) {
  return new LayerControl(layers, options);
};
