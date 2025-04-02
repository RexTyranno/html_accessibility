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
        `Axe‑CLI did not return valid JSON.\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`
      );
    }
  }

  static extractDetailedViolations(report) {
    const currentReport = Array.isArray(report) ? report[0] : report;

    const detailedViolations = {
      errors: [],
      warnings: [],
      notices: [],
      inapplicable: currentReport.inapplicable || [],
      incomplete: currentReport.incomplete || [],
    };

    // Categorize violations
    const violations = currentReport.violations || [];
    violations.forEach((violation) => {
      console.log(violation);
      const violationDetails = {
        id: violation.id,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        impact: violation.impact,
        // Include the tags array from the original violation
        tags: violation.tags || [],
        affected_elements: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failure_summary: node.failureSummary,
          any_checks: node.any.map((check) => ({
            id: check.id,
            message: check.message,
            data: check.data,
          })),
          all_checks: node.all.map((check) => ({
            id: check.id,
            message: check.message,
            data: check.data,
          })),
          none_checks: node.none.map((check) => ({
            id: check.id,
            message: check.message,
            data: check.data,
          })),
        })),
      };

      // Categorize based on impact
      switch (violation.impact) {
        case "critical":
        case "serious":
          detailedViolations.errors.push(violationDetails);
          break;
        case "moderate":
          detailedViolations.warnings.push(violationDetails);
          break;
        default:
          detailedViolations.notices.push(violationDetails);
      }
    });

    // Process inapplicable rules to ensure they also have tags
    if (currentReport.inapplicable) {
      detailedViolations.inapplicable = currentReport.inapplicable.map(
        (rule) => ({
          id: rule.id,
          description: rule.description,
          help: rule.help,
          helpUrl: rule.helpUrl,
          tags: rule.tags || [],
        })
      );
    }

    // Process incomplete rules to ensure they also have tags
    if (currentReport.incomplete) {
      detailedViolations.incomplete = currentReport.incomplete.map((rule) => ({
        id: rule.id,
        description: rule.description,
        help: rule.help,
        helpUrl: rule.helpUrl,
        tags: rule.tags || [],
      }));
    }

    // Add additional report metadata
    detailedViolations.metadata = {
      testEngine: currentReport.testEngine,
      testRunner: currentReport.testRunner,
      testEnvironment: currentReport.testEnvironment,
      timestamp: currentReport.timestamp,
      url: currentReport.url,
    };

    return detailedViolations;
  }

  static generateReport(url, outputFile = "accessibility_report.json") {
    try {
      // Run Axe test
      const report = this.runAxeTest(url);

      // Extract detailed violations
      const detailedReport = this.extractDetailedViolations(report);

      // Save detailed report
      fs.writeFileSync(outputFile, JSON.stringify(detailedReport, null, 2));
      console.log(`Detailed report saved to ${path.resolve(outputFile)}`);

      // Console summary
      console.log(`Errors: ${detailedReport.errors.length}`);
      console.log(`Warnings: ${detailedReport.warnings.length}`);
      console.log(`Notices: ${detailedReport.notices.length}`);
      console.log(`Inapplicable Rules: ${detailedReport.inapplicable.length}`);
      console.log(`Incomplete Rules: ${detailedReport.incomplete.length}`);

      // Exit with status based on violations
      process.exit(detailedReport.errors.length > 0 ? 1 : 0);
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

// Entry point
if (require.main === module) {
  AccessibilityReporter.main();
}

module.exports = AccessibilityReporter;
