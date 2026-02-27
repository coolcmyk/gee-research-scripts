// Define the region of interest
// 4 queues
var current_queue = 4;
var aoi = table.filter(ee.Filter.eq("id", current_queue));

var startDate = "2023-01-01";
var endDate = "2023-12-31";

var CRS = "EPSG:4326";
var SCALE = 10;

// Load Sentinel-1 GRD data
var collection = ee
  .ImageCollection("COPERNICUS/S1_GRD")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
  .filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"))
  .filter(ee.Filter.eq("instrumentMode", "IW"))
  .select(["VV", "VH"])
  .filterBounds(aoi);

print(collection);

var id = collection.aggregate_array("system:id").getInfo();
print(id);

// Function to apply Lee speckle filter to an image
var applyLeeFilter = function (image) {
  // Apply Lee filter using a 2x2 pixel window
  var leeFiltered = image.focalMedian({
    radius: 2,
    kernelType: "circle",
    iterations: 1,
  });
  return leeFiltered.copyProperties(image, image.propertyNames());
};
var filteredCollection = collection.map(applyLeeFilter);

// Display the original and filtered images on the map
//Map.addLayer(collection.first().clip(aoi), {min: -25, max: 0}, 'Original Image');
Map.addLayer(
  filteredCollection.first().clip(aoi),
  { min: -25, max: 0 },
  "Filtered Image",
);

var batch = require("users/fitoprincipe/geetools:batch");
var options = {
  name: current_queue + "A_{id}",
  scale: SCALE,
  region: aoi,
  type: "float",
  crs: CRS,
};
batch.Download.ImageCollection.toDrive(filteredCollection, "S1_VVVH", options);
