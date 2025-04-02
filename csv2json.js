const fs = require("fs");
const { Parser } = require("json2csv");

// Read the JSON file
fs.readFile("wcag_compliance_report.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading JSON file:", err);
    return;
  }

  try {
    const jsonData = JSON.parse(data); // Parse JSON
    const parser = new Parser(); // Create CSV parser
    const csv = parser.parse(jsonData); // Convert to CSV

    // Write the CSV file
    fs.writeFile("output.csv", csv, (err) => {
      if (err) {
        console.error("Error writing CSV file:", err);
      } else {
        console.log("CSV file has been saved as output.csv");
      }
    });
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
});
