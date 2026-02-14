var aoi = table.filter(ee.Filter.eq("id", 1));
var startDate = "2023-01-01";
var endDate = "2023-12-31";
// Load Sentinel-1 GRD data

var collection = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterDate(startDate, endDate)
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
  .filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"))
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
/*
// Export the image
Export.image.toDrive({
  image: filteredImage.first(),
  description: 'S1_GLCM_7_5',
  region: aoi,
  scale: 10,
  crs: 'EPSG:4326'
});
*/
var batch = require("users/fitoprincipe/geetools:batch");
var options = {
  name: "8_{id}",
  scale: 10,
  region: aoi,
  type: "float",
  crs: "EPSG:4326",
};
batch.Download.ImageCollection.toDrive(filteredImage, "S1_GLCM", options);
