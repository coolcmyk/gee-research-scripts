var current_queue = 1;
var aoi = table.filter(ee.Filter.eq("id", current_queue));

var startDate = "2023-01-01";
var endDate = "2023-12-31";

var CLOUD_FILTER = 5;
var CRS = "EPSG:4326";
var SCALE = 10;

function maskS2clouds(image) {
  var qa = image.select("QA60");
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000); }

var addLSWI = function(image) {
  var LSWI = image.normalizedDifference(['B3', 'B8']).rename('LSWI');
  return image.addBands(LSWI);
};

var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", CLOUD_FILTER))
  .map(maskS2clouds)
  .map(addLSWI)
  .select("LSWI")
  .filterBounds(aoi);

print(sentinel2);

var select = sentinel2.first();

var visualization = {
  min: -1,
  max: 1,
  palette: ['green', 'white', 'blue']
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
batch.Download.ImageCollection.toDrive(sentinel2, "S2_LSWI", options);
