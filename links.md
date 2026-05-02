Let me go through what's actually available and free to use.

**Food asset locations — Vancouver Open Data Portal**

This is your foundation. Let me check what specific datasets they have.Here's the full data source breakdown for your project, organized by what each source gives you and where to get it.

---

**Food Asset Locations — Vancouver Open Data Portal**

This is your base layer. There are three key datasets, all free, all downloadable as CSV or accessible via API:

**Community Gardens and Food Trees** — contains locations and attributes of community gardens and food trees across Vancouver, updated weekly. This gives you coordinates, number of plots, and managing organizations.

**Free and Low Cost Food Programs** — covers meals, grocery hampers, food bank programs, low cost groceries, and grocery vouchers across Vancouver. This dataset is refreshed daily and includes a last-updated date per record. This is probably your most important dataset because these are the resources vulnerable populations actually depend on.

**Food Vendors** — location and information of food vendors on Vancouver streets. Less critical for food security but adds completeness to your map.

You can also pull in **BC-wide food bank locations** from the Open Government Portal, which is a point dataset identifying food banks in British Columbia, published by the provincial government.

All of these are accessible at opendata.vancouver.ca and can be downloaded as GeoJSON or CSV with lat/long coordinates — ready to drop onto a Leaflet or Mapbox map.

---

**Neighbourhood Demographics — Census Local Area Profiles**

The City of Vancouver has census data broken down by its 22 Local Areas, covering population, age, sex, dwelling type, families, income, immigration, housing, education, and labour. The most recent available on the portal is the 2016 Census, though 2021 Census data also exists through Statistics Canada. The key fields you'd want are population density, median household income, percentage of seniors, and percentage of renters — these are your vulnerability indicators. The data is in CSV/XLS format and you'd join it to the Local Area boundary polygons.

---

**Flood Hazard Zones — Vancouver Open Data Portal**

This is one of your two disruption scenario layers. The Designated Floodplain dataset includes Scenario 1 (present-day 500-year coastal flood) and Scenario 3 (2100 coastal flooding with 1 metre of sea level rise), plus the Still Creek floodplain for overland flooding and a wave effect zone. This is geospatial polygon data — you overlay it on your food assets and can instantly show which community gardens, food banks, and food programs fall within flood risk areas.

The City's VanMap portal also contains mapping of the designated flood hazard area and wave-effect zone, which you could use as a reference or fallback.

---

**Heat Vulnerability — ClimateReadyBC and CANUE**

This is your second disruption scenario layer. The hackathon brief directly links to two sources:

**ClimateReadyBC Data Catalogue** (climatereadybc.gov.bc.ca/pages/risk-data) — provincial climate risk data for BC, including temperature projections and heat-related risk indicators.

**CANUE** (canue.ca) — provides annual average of daily maximum temperatures above 25°C at a neighbourhood level. This lets you identify which areas of Vancouver experience the most extreme heat.

For the heat scenario, the logic doesn't need to be a complex climate model. You'd define simple rules: during a heat event, outdoor food assets (community gardens, outdoor markets, food vendors) become less accessible. Food assets far from transit become harder to reach for seniors and people without cars. You flag assets in high-heat areas and show which neighbourhoods lose the most food access under those conditions.

---

**Neighbourhood Boundaries — Vancouver Open Data Portal**

You'll need boundary polygons to define your neighbourhoods on the map. The portal has the 22 Local Area boundaries as shapefiles/GeoJSON. If you want to align with the Villages program, the 17 Villages boundaries may be available through Shape Your City or the City's planning department — worth checking or approximating from the Villages maps.

---

**How it all fits together technically**

Your map starts with food asset pins (from the three Open Data food datasets). Each pin has a type (garden, food bank, meal program, vendor). Behind the map, each of Vancouver's 22 Local Areas has demographic data attached (income, density, seniors, renters).

When a user toggles on the flood scenario, you overlay the floodplain polygons and flag any food assets that fall within them. Neighbourhoods that lose a high percentage of their assets get highlighted.

When a user toggles on the heat scenario, you apply your rule set (outdoor assets dimmed, assets far from transit flagged) and again show which neighbourhoods are most impacted.

The resilience score per neighbourhood would be something like: number of food asset types × count of assets, minus the assets lost under the active scenario, weighted by the neighbourhood's demographic vulnerability. Keep the formula simple — you're not writing a research paper, you're building a demo.

---

**One practical note:** download all the datasets early in Sprint 1 and explore them before you commit to your exact feature set. Sometimes a dataset looks great on the website but turns out to be messy, missing coordinates, or formatted in a way that takes time to clean up. The food programs dataset being refreshed daily and having a last-updated field per record is a good sign, but the community gardens dataset is maintained manually and warns about potential data entry errors. Budget a day or two for data exploration and cleaning.

Want me to help you map out Sprint 1 user stories now that you know what data is available?