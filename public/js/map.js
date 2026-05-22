var map = L.map("map").setView([49.2789639460617, -123.122056018925], 13);
const API_LIMIT = 100;
const MIN_ZOOM = 16;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Create a custom colored marker icon
function createColoredMarker(color) {
  return L.divIcon({
    html: `<svg width="25" height="41" viewBox="0 0 25 41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 20 12.5 41 12.5 41s12.5-21 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
    className: "custom-marker",
  });
}

// --- Zoom hint overlay ---
const zoomHint = L.control({ position: "topright" });
zoomHint.onAdd = function () {
  const div = L.DomUtil.create("div", "zoom-hint");
  div.style.cssText =
    "background:rgba(255,255,255,0.85);padding:8px 12px;border-radius:6px;font-size:13px;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.2);";
  div.innerText = "Zoom in to see locations";
  return div;
};
zoomHint.addTo(map);

function updateZoomHint() {
  const el = document.querySelector(".zoom-hint");
  if (!el) return;
  el.style.display = map.getZoom() < MIN_ZOOM ? "block" : "none";
}

// --- Layer groups (so we can clear markers on pan/zoom) ---
const foodProgramsLayer = L.layerGroup().addTo(map);
const commGardensLayer = L.layerGroup().addTo(map);
const foodBusinessLayer = L.layerGroup().addTo(map);
const restaurantsLayer = L.layerGroup().addTo(map);

// --- Bounding box filter for current viewport ---
function getBoundsParam(geoName = "geom") {
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  const poly = `POLYGON((${sw.lng} ${sw.lat},${ne.lng} ${sw.lat},${ne.lng} ${ne.lat},${sw.lng} ${ne.lat},${sw.lng} ${sw.lat}))`;
  return `in_bbox(${geoName}, ${sw.lat}, ${sw.lng}, ${ne.lat}, ${ne.lng})`;
}

// MARKERS
// Free and low-cost food programs
function loadFoodPrograms() {
  foodProgramsLayer.clearLayers();
  fetch(
    `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/free-and-low-cost-food-programs/records?where=NOT(geom%20is%20null)%20AND%20${getBoundsParam()}&limit=100`,
  )
    .then((response) => response.json())
    .then((locations) => {
      locations.results.forEach((location) => {
        const latitude =
          typeof location.latitude === "number"
            ? location.latitude
            : location.geom?.lat;
        const longitude =
          typeof location.longitude === "number"
            ? location.longitude
            : location.geom?.lon;
        const name = location.program_name;
        if (typeof latitude === "number" && typeof longitude === "number") {
          L.marker([latitude, longitude])
            .addTo(foodProgramsLayer)
            .bindPopup(name || "Location");
        }
      });
    })
    .catch((error) => {
      console.error("Error loading food program markers:", error);
    });
}

// Community gardens
const commGardensBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/community-gardens-and-food-trees/records";
let commGardensCount = 0;

function loadCommunityGardens(offset = 0) {
  if (offset === 0) commGardensCount = 0;
  fetch(
    `${commGardensBaseUrl}?where=NOT(geo_point_2d%20is%20null)%20AND%20${getBoundsParam("geo_point_2d")}&limit=${API_LIMIT}&offset=${offset}`,
  )
    .then((response) => response.json())
    .then((locations) => {
      if (!commGardensCount) {
        commGardensCount = locations.total_count;
      }

      locations.results.forEach((location) => {
        const latitude =
          typeof location.latitude === "number"
            ? location.latitude
            : location.geo_point_2d?.lat;
        const longitude =
          typeof location.longitude === "number"
            ? location.longitude
            : location.geo_point_2d?.lon;
        const name = location.name;
        if (typeof latitude === "number" && typeof longitude === "number") {
          L.marker([latitude, longitude], {
            icon: createColoredMarker("green"),
          })
            .addTo(commGardensLayer)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < commGardensCount) {
        loadCommunityGardens(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading community garden markers:", error);
    });
}

// Food-related businesses
const foodBusinessBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records?where=NOT(geo_point_2d%20is%20null)%20AND%20(businesstype%3D%22Food%20Market%22%20OR%20businesstype%3D%22Grocery%20Store%22%20OR%20businesstype%3D%22Pharmacy%22%20OR%20businesstype%3D%22Retail%20Dealer%20-%20Food%22)";
let foodBusinessCount = 0;

function loadFoodBusinesses(offset = 0) {
  if (offset === 0) foodBusinessCount = 0;
  fetch(
    `${foodBusinessBaseUrl}%20AND%20${getBoundsParam("geo_point_2d")}&limit=${API_LIMIT}&offset=${offset}`,
  )
    .then((response) => response.json())
    .then((locations) => {
      if (!foodBusinessCount) {
        foodBusinessCount = locations.total_count;
      }

      locations.results.forEach((location) => {
        const latitude =
          typeof location.latitude === "number"
            ? location.latitude
            : location.geo_point_2d?.lat;
        const longitude =
          typeof location.longitude === "number"
            ? location.longitude
            : location.geo_point_2d?.lon;
        const name = location.businesstradename;
        if (typeof latitude === "number" && typeof longitude === "number") {
          L.marker([latitude, longitude], {
            icon: createColoredMarker("pink"),
          })
            .addTo(foodBusinessLayer)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < foodBusinessCount) {
        loadFoodBusinesses(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading food business markers:", error);
    });
}

// Restaurants
const restaurantsBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records?where=NOT(geo_point_2d%20is%20null)%20AND%20(businesstype%3D%22Limited%20Service%20Food%20Establishment%22%20OR%20businesstype%3D%22Restaurant%22)";
let restaurantsCount = 0;

function loadRestaurants(offset = 0) {
  if (offset === 0) restaurantsCount = 0;
  fetch(
    `${restaurantsBaseUrl}%20AND%20${getBoundsParam("geo_point_2d")}&limit=${API_LIMIT}&offset=${offset}`,
  )
    .then((response) => response.json())
    .then((locations) => {
      if (!restaurantsCount) {
        restaurantsCount = locations.total_count;
      }

      locations.results.forEach((location) => {
        const latitude =
          typeof location.latitude === "number"
            ? location.latitude
            : location.geo_point_2d?.lat;
        const longitude =
          typeof location.longitude === "number"
            ? location.longitude
            : location.geo_point_2d?.lon;
        const name = location.businesstradename;
        if (typeof latitude === "number" && typeof longitude === "number") {
          L.marker([latitude, longitude], {
            icon: createColoredMarker("red"),
          })
            .addTo(restaurantsLayer)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < restaurantsCount) {
        loadRestaurants(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading restaurant markers:", error);
    });
}

// --- Refresh all markers for current viewport ---
function refreshMarkers() {
  updateZoomHint();
  if (map.getZoom() < MIN_ZOOM) {
    foodProgramsLayer.clearLayers();
    commGardensLayer.clearLayers();
    foodBusinessLayer.clearLayers();
    restaurantsLayer.clearLayers();
    return;
  }
  loadRestaurants(0); //calling in reverse order so that restaurants (most common) are on the bottom
  loadFoodBusinesses(0);
  loadCommunityGardens(0);
  loadFoodPrograms();
}

// Debounce so panning doesn't fire on every pixel
let refreshTimer = null;
map.on("moveend", () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshMarkers, 400);
});
map.on("zoomend", () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshMarkers, 400);
});

// Initial load
refreshMarkers();

// --- Floodplain polygons ---
const floodplainLayer = L.layerGroup().addTo(map);
const FLOODPLAIN_MIN_ZOOM = 12; // Floodplains are large, show earlier than markers

function loadFloodplains() {
  floodplainLayer.clearLayers();
  if (map.getZoom() < FLOODPLAIN_MIN_ZOOM) return;

  fetch(
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/designated-floodplain/records?limit=100",
  )
    .then((response) => response.json())
    .then((data) => {
      data.results.forEach((record) => {
        const geometry = record.geom?.geometry;
        if (!geometry) return;

        // Convert GeoJSON coords [lng, lat] to Leaflet [lat, lng]
        function convertRing(ring) {
          return ring.map(([lng, lat]) => [lat, lng]);
        }

        let latlngs;
        if (geometry.type === "Polygon") {
          latlngs = geometry.coordinates.map(convertRing);
        } else if (geometry.type === "MultiPolygon") {
          latlngs = geometry.coordinates.map((poly) => poly.map(convertRing));
        } else {
          return;
        }

        L.polygon(latlngs, {
          color: "#da053a",
          weight: 1.5,
          fillColor: "#f84a70",
          fillOpacity: 0.25,
        })
          .addTo(floodplainLayer)
          .bindPopup(
            `<strong>${record.name || "Floodplain"}</strong><br>${record.description || ""}`,
          );
      });
    })
    .catch((error) => {
      console.error("Error loading floodplain polygons:", error);
    });
}

// Hook floodplains into the existing zoom/pan refresh
const _originalRefresh = refreshMarkers;
refreshMarkers = function () {
  _originalRefresh();
  loadFloodplains();
};

// Load on init
loadFloodplains();

// --- Click-to-draw circle with radius slider ---

// Create the radius slider control
const circleControl = L.control({ position: "bottomleft" });
circleControl.onAdd = function () {
  const div = L.DomUtil.create("div", "circle-control");
  div.style.cssText =
    "background:rgba(255,255,255,0.9);padding:10px 14px;border-radius:8px;font-size:13px;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.3);min-width:180px;";
  div.innerHTML = `
    <div style="margin-bottom:6px;font-weight:bold;">Search Radius</div>
    <input type="range" id="radius-slider" min="100" max="5000" step="100" value="500"
      style="width:100%;cursor:pointer;" />
    <div style="display:flex;justify-content:space-between;margin-top:4px;">
      <span>100m</span>
      <span id="radius-label" style="font-weight:bold;">500m</span>
      <span>5km</span>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#666;" id="circle-hint">Click map to place circle</div>
  `;

  // Prevent map clicks/drags from firing while using the slider
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);

  return div;
};
circleControl.addTo(map);

let activeCircle = null;
let circleRadius = 500;

// Update circle when slider moves
map.on("controladd", function () {}); // ensure control is in DOM first
setTimeout(function () {
  const slider = document.getElementById("radius-slider");
  const label = document.getElementById("radius-label");
  if (!slider) return;

  slider.addEventListener("input", function () {
    circleRadius = parseInt(this.value);
    label.textContent =
      circleRadius >= 1000
        ? (circleRadius / 1000).toFixed(1) + "km"
        : circleRadius + "m";
    if (activeCircle) {
      activeCircle.setRadius(circleRadius);
    }
  });
}, 100);

// Draw circle on map click
map.on("click", function (e) {
  if (activeCircle) {
    map.removeLayer(activeCircle);
  }
  activeCircle = L.circle(e.latlng, {
    radius: circleRadius,
    color: "#1977f1",
    weight: 2,
    fillColor: "#286cc5",
    fillOpacity: 0.3,
  }).addTo(map);

  // Tell the React UI that a location was picked
  window.parent.postMessage(
    {
      type: "LOCATION_SELECTED",
      lat: e.latlng.lat,
      lng: e.latlng.lng,
    },
    "*",
  );

  const hint = document.getElementById("circle-hint");
  if (hint) hint.textContent = "Click map to move circle";
});

// Supposedly removes the circle on double-click, but does not always work.
map.on("dblclick", function () {
  if (activeCircle) {
    map.removeLayer(activeCircle);
    activeCircle = null;
    const hint = document.getElementById("circle-hint");
    if (hint) hint.textContent = "Click map to place circle";
  }
});

// --- Legend with layer toggles ---
const legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
  const div = L.DomUtil.create("div", "map-legend");
  div.style.cssText =
    "background:rgba(30,33,37,0.92);padding:10px 14px;border-radius:10px;font-size:13px;color:#e8e8e8;box-shadow:0 2px 8px rgba(0,0,0,0.4);min-width:170px;border:1px solid #444;";

  const items = [
    { label: "Food Programs", color: "#2a81cb", layer: foodProgramsLayer },
    { label: "Community Gardens", color: "green", layer: commGardensLayer },
    { label: "Food Businesses", color: "pink", layer: foodBusinessLayer },
    { label: "Restaurants", color: "red", layer: restaurantsLayer },
    {
      label: "Flood Zones",
      color: "#f84a70",
      layer: floodplainLayer,
      isPolygon: true,
    },
  ];

  div.innerHTML = `<div style="font-weight:600;margin-bottom:8px;font-size:12px;color:#aaa;letter-spacing:0.5px;">LEGEND - click to toggle</div>`;

  items.forEach(({ label, color, layer, isPolygon }) => {
    const row = L.DomUtil.create("div", "", div);
    row.style.cssText =
      "display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;user-select:none;";

    const icon = L.DomUtil.create("div", "", row);
    if (isPolygon) {
      icon.style.cssText = `width:16px;height:16px;border-radius:3px;background:${color};opacity:0.7;border:2px solid #da053a;flex-shrink:0;`;
    } else {
      icon.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};flex-shrink:0;border:2px solid rgba(255,255,255,0.3);`;
    }

    const text = L.DomUtil.create("span", "", row);
    text.textContent = label;
    text.style.cssText = "font-size:13px;";

    let visible = true;
    row.addEventListener("click", function () {
      visible = !visible;
      if (visible) {
        map.addLayer(layer);
        icon.style.opacity = "1";
        text.style.color = "#e8e8e8";
      } else {
        map.removeLayer(layer);
        icon.style.opacity = "0.3";
        text.style.color = "#666";
      }
    });
  });

  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);
  return div;
};
legend.addTo(map);

// This connects Daniel's main page slider to this page's slider
window.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SET_RADIUS") {
    circleRadius = e.data.radius;
    const slider = document.getElementById("radius-slider");
    const label = document.getElementById("radius-label");
    if (slider) slider.value = circleRadius;
    if (label)
      label.textContent =
        circleRadius >= 1000
          ? (circleRadius / 1000).toFixed(1) + "km"
          : circleRadius + "m";
    if (activeCircle) activeCircle.setRadius(circleRadius);
  }

  // Pan map to searched location
  if (e.data && e.data.type === "PAN_TO") {
    map.setView([e.data.lat, e.data.lng], 15);
  }

  // Place circle at searched location
  if (e.data && e.data.type === "PLACE_CIRCLE") {
    if (activeCircle) map.removeLayer(activeCircle);
    activeCircle = L.circle([e.data.lat, e.data.lng], {
      radius: circleRadius,
      color: "#1977f1",
      weight: 2,
      fillColor: "#286cc5",
      fillOpacity: 0.3,
    }).addTo(map);
  }
});
