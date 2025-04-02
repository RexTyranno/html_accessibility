const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class AccessibilityReporter {
  static runAxeTest(url) {
    const cmd = "npx";
    const args = [
      "@axe-core/cli",
      "-q",
      "-j",
      "--chrome-path",
      "/home/bubbu/chrome-for-testing/chrome-linux64/chrome",
      url,
    ];

    const result = spawnSync(cmd, args, { encoding: "utf-8" });
    const output = (result.stdout || result.stderr).trim();

    try {
      return JSON.parse(output);
    } catch (e) {
      throw new Error(
        `Axe-CLI did not return valid JSON.\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`
      );
    }
  }

  static mapImpactLevel(impact) {
    return (
      {
        critical: "error",
        serious: "error",
        moderate: "warning",
        minor: "notice",
      }[impact] || "notice"
    );
  }

  static reformatViolations(report) {
    const currentReport = Array.isArray(report) ? report[0] : report;
    const reformattedViolations = [];

    ["violations"].forEach((category) => {
      (currentReport[category] || []).forEach((violation) => {
        violation.nodes.forEach((node) => {
          reformattedViolations.push({
            code: violation.id,
            type: AccessibilityReporter.mapImpactLevel(violation.impact),
            message: violation.description,
            context: node.html,
            selector: node.target[0] || null,
            runner: "axe-core",
            impact: violation.impact,
            helpUrl: violation.helpUrl,
          });
        });
      });
    });

    return reformattedViolations;
  }

  static generateReport(url, outputFile = "accessibility_report.json") {
    try {
      const report = this.runAxeTest(url);
      const reformattedReport = this.reformatViolations(report);

      fs.writeFileSync(outputFile, JSON.stringify(reformattedReport, null, 2));
      console.log(`Reformatted report saved to ${path.resolve(outputFile)}`);

      const errorCount = reformattedReport.filter(
        (v) => v.type === "error"
      ).length;
      console.log(`Errors: ${errorCount}`);

      process.exit(errorCount > 0 ? 1 : 0);
    } catch (error) {
      console.error("Error generating accessibility report:", error.message);
      process.exit(1);
    }
  }

  static main() {
    const args = process.argv.slice(2);
    if (args.length < 1 || args.length > 2) {
      console.log(
        "Usage: node accessibility-reporter.js <url_or_path> [output.json]"
      );
      process.exit(1);
    }
    this.generateReport(args[0], args[1] || "accessibility_report.json");
  }
}

if (require.main === module) {
  AccessibilityReporter.main();
}

module.exports = AccessibilityReporter;
