var current_queue = 1;
var aoi = table.filter(ee.Filter.eq("id", current_queue));

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

//for EVI
var addEVI = function (image) {
  var EVI = image
    .expression("2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))", {
      NIR: image.select("B8"),
      RED: image.select("B4"),
      BLUE: image.select("B2"),
    })
    .rename("EVI");
  return image.addBands(EVI);
};

// Load Sentinel-2 data for the specified time range and region
var sentinel2 = ee
  .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", CLOUD_FILTER))
  .map(maskS2clouds)
  .map(addEVI)
  .select("EVI") //choose between NDVI/EVI/LSWI/NDWI
  .filterBounds(aoi);

print(sentinel2);

var select = sentinel2.first();

// Display the map
var visualization = {
  min: -1,
  max: 1,
  palette: ["green", "white", "blue"],
};

Map.addLayer(select.clip(aoi), visualization, "Filtered");

var batch = require("users/fitoprincipe/geetools:batch");
var options = {
  name: current_queue + "_{id}",
  scale: SCALE,
  region: aoi,
  type: "float",
  crs: CRS,
};
batch.Download.ImageCollection.toDrive(sentinel2, "S2_EVI", options);
