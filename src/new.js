/**********************************
 *  GLOBAL CONFIG
 **********************************/

var QUEUE_ID = 1;   // 🔁 CHANGE THIS ONLY
var mode = 'ASCENDING';  // 'ASCENDING' or 'DESCENDING'

var CRS = 'EPSG:4326';
var SCALE = 10;

var aoi = table.filter(ee.Filter.eq('id', QUEUE_ID));
var batch = require('users/fitoprincipe/geetools:batch');

// 👇 Dynamic prefix logic
var prefix = (mode === 'ASCENDING') 
  ? QUEUE_ID + 'A' 
  : QUEUE_ID.toString();


/**********************************
 *  BASE SENTINEL-1 LOADER
 **********************************/

function loadS1(startDate, endDate, polarizations, orbitPass) {
  
  var col = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterDate(startDate, endDate)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filterBounds(aoi);

  if (orbitPass !== null) {
    col = col.filter(ee.Filter.eq('orbitProperties_pass', orbitPass));
  }

  polarizations.forEach(function(pol) {
    col = col.filter(
      ee.Filter.listContains('transmitterReceiverPolarisation', pol)
    );
  });

  return col.select(['VV', 'VH']);
}


/**********************************
 *  GLCM PIPELINE
 **********************************/

function runGLCM() {

  var startDate = '2024-07-01';
  var endDate   = '2024-07-30';

  var collection = loadS1(startDate, endDate, ['VH'], mode);

  function computeGLCM(image) {
    var converted = image.toInt();
    var glcm = converted.glcmTexture({size: 3});
    return image.addBands(glcm);
  }

  var textureCollection = collection.map(computeGLCM);

  var exampleImage = ee.Image(textureCollection.first());
  var bandNames = exampleImage.bandNames();
  var bandsToKeep = bandNames.removeAll(['VV','VH']);
  var filteredImage = textureCollection.select(bandsToKeep);

  Map.addLayer(
    filteredImage.select('VH_asm').first().clip(aoi),
    {min: 0, max: 1, palette: ['green', 'white']},
    'GLCM'
  );

  var options = {
    name: prefix + '_{id}',   // 🔥 dynamic naming
    scale: SCALE,
    region: aoi,
    type: 'float',
    crs: CRS
  };

  batch.Download.ImageCollection.toDrive(
    filteredImage,
    'S1_GLCM',
    options
  );
}


/**********************************
 *  SPECKLE FILTER PIPELINE
 **********************************/

function runSpeckle() {

  var startDate = '2024-08-01';
  var endDate   = '2024-08-30';

  var collection = loadS1(
    startDate,
    endDate,
    ['VV','VH'],
    mode
  );

  function applyLeeFilter(image) {
    var filtered = image.focalMedian({
      radius: 2,
      kernelType: 'circle',
      iterations: 1
    });
    return filtered.copyProperties(image, image.propertyNames());
  }

  var filteredCollection = collection.map(applyLeeFilter);

  Map.addLayer(
    filteredCollection.first().clip(aoi),
    {min: -25, max: 0},
    'Speckle'
  );

  var options = {
    name: prefix + '_{id}',   // 🔥 same dynamic logic
    scale: SCALE,
    region: aoi,
    type: 'float',
    crs: CRS
  };

  batch.Download.ImageCollection.toDrive(
    filteredCollection,
    'S1_VVVH',
    options
  );
}


/**********************************
 *  RUN
 **********************************/

runGLCM();
runSpeckle();

