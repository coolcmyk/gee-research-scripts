// Define the region of interest
// // 4 queues => kita iterasi manual dari 1 sampai 4 pada GEE
var current_queue = 1;
var aoi = table.filter(ee.Filter.eq("id", current_queue));

var startDate = "2023-01-01";
var endDate = "2023-12-31";

var CRS = "EPSG:4326";
var SCALE = 10;

// Load Sentinel-1 GRD data
var collection = ee
  .ImageCollection("COPERNICUS/S1_GRD")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
  .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
  .filter(ee.Filter.eq("instrumentMode", "IW"))
  .select(["VV", "VH"])
  .filterBounds(aoi);

print(collection);

// Function to convert image to 32-bit integer
var convertToBit = function (image) {
  return image.toInt();
};

// Function to compute GLCM textures
var computeGLCMTextures = function (image) {
  // Convert to 32-bit integer
  var convertedImage = convertToBit(image);
  // Compute GLCM textures
  var glcmTextures = convertedImage.glcmTexture({ size: 3 });
  return image.addBands(glcmTextures);
};

// Apply GLCM texture computation to the entire Sentinel-1 GRD collection
var textureCollection = collection.map(computeGLCMTextures);

// Display the GLCM texture bands for a specific image
var exampleImage = ee.Image(textureCollection.first());

var bandNames = exampleImage.bandNames();
var bandsToKeep = bandNames.removeAll(["VV", "VH"]);
var filteredImage = textureCollection.select(bandsToKeep);

print("GLCM Texture Bands:", filteredImage.first().bandNames());

// Visualize one of the GLCM texture bands
// Display the map
var visualization = {
  min: 0,
  max: 1,
  palette: ["green", "white"],
};
Map.addLayer(
  filteredImage.select("VH_asm").first().clip(aoi),
  visualization,
  "GLCM Contrast",
);

var batch = require("users/fitoprincipe/geetools:batch");
var options = {
  name: current_queue + "_{id}",
  scale: SCALE,
  region: aoi,
  type: "float",
  crs: CRS,
};
batch.Download.ImageCollection.toDrive(filteredImage, "S1_GLCM", options);
