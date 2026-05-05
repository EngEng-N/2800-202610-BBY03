var map = L.map("map").setView([49.2789639460617, -123.122056018925], 13);
const API_LIMIT = 100;

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

// MARKERS
// Free and low-cost food programs - 77 locations
fetch(
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/free-and-low-cost-food-programs/records?where=NOT(geom%20is%20null)&limit=100",
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
          .addTo(map)
          .bindPopup(name || "Location");
      }
    });
  })
  .catch((error) => {
    console.error("Error loading location markers:", error);
  });

// Community gardens
const commGardensBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/community-gardens-and-food-trees/records?where=NOT(geo_point_2d%20is%20null)";
let commGardensCount = 0;

function loadCommunityGardens(offset = 0) {
  fetch(`${commGardensBaseUrl}&limit=${API_LIMIT}&offset=${offset}`)
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
            .addTo(map)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < commGardensCount) {
        loadCommunityGardens(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading location markers:", error);
    });
}

loadCommunityGardens(0);

// All types of food-related businesses (grocery stores, food markets, pharmacies, retail dealers - food)
const foodBusinessBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records?where=NOT(geo_point_2d%20is%20null)%20AND%20(businesstype%3D%22Food%20Market%22%20OR%20businesstype%3D%22Grocery%20Store%22%20OR%20businesstype%3D%22Pharmacy%22%20OR%20businesstype%3D%22Retail%20Dealer%20-%20Food%22)";
let foodBusinessCount = 0;

function loadFoodBusinesses(offset = 0) {
  fetch(`${foodBusinessBaseUrl}&limit=${API_LIMIT}&offset=${offset}`)
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
            .addTo(map)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < foodBusinessCount) {
        loadFoodBusinesses(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading location markers:", error);
    });
}

loadFoodBusinesses(0);

const restaurantsBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records?where=NOT(geo_point_2d%20is%20null)%20AND%20(businesstype%3D%22Limited%20Service%20Food%20Establishment%22%20OR%20businesstype%3D%22Restaurant%22)";
let restaurantsCount = 0;

function loadRestaurants(offset = 0) {
  fetch(`${restaurantsBaseUrl}&limit=${API_LIMIT}&offset=${offset}`)
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
            .addTo(map)
            .bindPopup(name || "Location");
        }
      });

      if (offset + API_LIMIT < restaurantsCount) {
        loadRestaurants(offset + API_LIMIT);
      }
    })
    .catch((error) => {
      console.error("Error loading location markers:", error);
    });
}

loadRestaurants(0);
