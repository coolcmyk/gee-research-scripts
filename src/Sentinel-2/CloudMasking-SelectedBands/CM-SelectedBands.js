var current_queue = 1;
var aoi = table.filter(ee.Filter.eq("id", current_queue));

// Define the time range for data collection (Full year 2023)
var startDate = "2023-01-01";
var endDate = "2023-12-31";

var CLOUD_FILTER = 5;
var CRS = "EPSG:4326";
var SCALE = 10;

// Cloud mask function
function maskS2clouds(image) {
  var qa = image.select("QA60");

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa
    .bitwiseAnd(cloudBitMask)
    .eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var sentinel2 = ee
  .ImageCollection("COPERNICUS/S2")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", CLOUD_FILTER))
  .map(maskS2clouds)
  .filterBounds(aoi);

print(sentinel2);

var id = sentinel2.aggregate_array("system:index").getInfo();
print(id);

var sentinel2_bands = sentinel2.select([
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B8A",
  "B11",
  "B12",
]);
//var sentinel2_bands = sentinel2.select (['B2', 'B3', 'B4']);
var select = sentinel2_bands.first();

// Display the map
var visualization = {
  min: 0.15,
  max: 0.8,
  bands: ["B4", "B3", "B2"],
};
//Map.addLayer(aoi, {color: 'red'}, "AOI")
Map.addLayer(select.clip(aoi), visualization, "RGB");

var batch = require("users/fitoprincipe/geetools:batch");
var options = {
  name: current_queue + "_{id}",
  scale: SCALE,
  region: aoi,
  type: "float",
  crs: CRS,
};
batch.Download.ImageCollection.toDrive(sentinel2_bands, "S2_Bands", options);
