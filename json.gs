/**
 * Main method is called when the script receives a GET request.
 * Receives the request, generates and returns the output.
 */
function doGet(request) {
  // Get request params.
  var sheetKey  = request.parameters.id;
  var sheetName = request.parameters.sheet;
  var callback  = request.parameters.callback;
  var headerRow = request.parameters.header;
  var startRow  = request.parameters.startRow;
    
  // Parse the spreadsheet.
  var spreadsheet = SpreadsheetApp.openById(sheetKey);
  var keys = getHeaderRowKeys_(spreadsheet, sheetName, headerRow);
  var data = readData_(spreadsheet, sheetName, keys, startRow);
  
  // Filter for matching terms.
  data = data.filter(function(entry) {
    var matches = true;
    for (var k in keys) {
      var key = keys[k].replace(/\s+/g, '_');
      var searchTerm = request.parameters[key];
      // Use the string form of the value since params are strings by default
      if (searchTerm != undefined)
        matches = matches && ("" + entry[key] == searchTerm);
    }
    // Matches is true iff all params are undefined or all values for keys match.
    return matches;
  });
  
  // Write and return the response.
  var response = JSON.stringify({ records: data });
  var output = ContentService.createTextOutput();
  if (callback == undefined) {
    // Serve as JSON
    output.setContent(response).setMimeType(ContentService.MimeType.JSON);
  } else {
    // Serve as JSONP
    output.setContent(callback + "(" + response + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return output;
}

/**
 * Get a row in a spreadsheet as an Object, using the values in the header row as
 * keys and the corresponding row values as the values.
 * 
 * @param spreadsheet Spreadsheet object housing the sheet and header
 * @param sheetName Name of the specific sheet in the spreadsheet with the data
 * @param properties Optional array of keys to use for the row values. Default is the first row.
 * @param startRowNum Optional top row number of the rows to parse. The default is
 * the second row (i.e., below the header).
 */
function readData_(spreadsheet, sheetName, properties, startRowNum) {
  if (typeof properties == "undefined") {
    properties = getHeaderRowKeys_(spreadsheet, sheetName);
  }
  
  var rows = getDataRows_(spreadsheet, sheetName, startRowNum);
  var data = [];
  for (var r = 0, l = rows.length; r <= l; r++) {
    var row = rows[r];
    var record = {};
    for (var p in properties) {
      record[properties[p]] = row[p];
    }
    data.push(record);
  }
  return data;
}

/**
 * Parse spreadsheet data as an array of Javascript Objects.
 *
 * @param spreadsheet Spreadsheet object with the data to get
 * @param sheetName Name of the specific sheet in the spreadsheet with the data
 * @param startRowNum Optional top row number of the rows to parse. The default is
 * the second row (i.e., below the header).
 */
function getDataRows_(spreadsheet, sheetName, startRowNum) {
  if (typeof startRowNum == "undefined") startRowNum = 2;
  
  var sheet = spreadsheet.getSheetByName(sheetName);
  return sheet.getRange(startRowNum, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
}

/**
 * Return the array of keys used in the header, replacing whitespace with underscores.
 * 
 * @param spreadsheet Spreadsheet object housing the sheet and header
 * @param sheetName Name of the specific sheet in the spreadsheet whose header values to get
 * @param rowNum Optional exact row number of the header. Default is the first row.
 */
function getHeaderRowKeys_(spreadsheet, sheetName, rowNum) {
  if (typeof rowNum == "undefined") rowNum = 1;
  return getHeaderRow_(spreadsheet, sheetName, rowNum).map(function(value) { 
    return value.replace(/\s+/g, '_');
  });
}

/**
 * Get the values in the header row of the given sheet in a spreadsheet
 * 
 * @param spreadsheet Spreadsheet object housing the sheet and header
 * @param sheetName Name of the specific sheet in the spreadsheet whose header values to get
 * @param rowNum Exact row number of the header.
 */
function getHeaderRow_(spreadsheet, sheetName, rowNum) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  return sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
}


/********************************** TESTS **********************************/


/**
 * Basic test logs a request and response. Use View -> Logs to check if it's
 * correct.
 * (In the future maybe actually check equality to expected output.)
 * @param request The HTTP request to test
 */
function runTest_(request) {
  Logger.log(request);
  Logger.log(doGet(request).getContent().toString());
}

/**
 * Test the original functionality of returning all objects
 * in the spreadsheet in JSON.
 */
function test1() {
  runTest_({
      parameters : {
        id : "0AgviZ9NWh5fvdDdNMlI2aXRCR2lCX1B1alZ6ZjZxSkE",
        sheet : "Summary",
        header : 2,
        startRow : 3,
      }
  });
}

/**
 * Test filtering on the spreadsheet JSON for one value.
 */
function test2() {
  runTest_({
      parameters : {
        id : "0AgviZ9NWh5fvdDdNMlI2aXRCR2lCX1B1alZ6ZjZxSkE",
        sheet : "Summary",
        header : 2,
        Status : "Associate"
      }
  });
}

/**
 * Test stricter filtering on the spreadsheet for multiple values.
 */
function test3() {
  runTest_({
      parameters : {
        id : "0AgviZ9NWh5fvdDdNMlI2aXRCR2lCX1B1alZ6ZjZxSkE",
        sheet : "Summary",
        header : 2,
        startRow : 3,
        First_Name : "Greatest",
        Last_Name : "Ever"
      }
  });
}
