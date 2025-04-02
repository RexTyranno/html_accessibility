function wcagIdToTagFormat(wcagId) {
  return `wcag${wcagId.replace(/\./g, "")}`;
}

function extractWcagIdFromTag(tag) {
  if (!tag.startsWith("wcag")) return null;

  const numericPart = tag.substring(4); // Remove 'wcag' prefix
  if (numericPart.length === 3) {
    return `${numericPart[0]}.${numericPart[1]}.${numericPart[2]}`;
  } else if (numericPart.length === 4) {
    return `${numericPart[0]}.${numericPart[1]}.${numericPart.substring(2)}`;
  }
  return null;
}

function generateWcagReport(wcagMapping, auditSummary) {
  const report = [];
  const wcagViolationMap = new Map();

  const categories = [
    { name: "errors", status: "error" },
    { name: "warnings", status: "warning" },
    { name: "notices", status: "notice" },
    { name: "inapplicable", status: "inapplicable" },
  ];

  categories.forEach((category) => {
    const items = auditSummary[category.name] || [];

    items.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        const wcagTags = item.tags.filter((tag) => tag.startsWith("wcag"));

        wcagTags.forEach((tag) => {
          const wcagId = extractWcagIdFromTag(tag);
          if (wcagId) {
            if (!wcagViolationMap.has(wcagId)) {
              wcagViolationMap.set(wcagId, []);
            }
            wcagViolationMap.get(wcagId).push({
              status: category.status,
              description: item.description,
              impact: item.impact,
              id: item.id,
            });
          }
        });
      }
    });
  });

  wcagMapping.forEach((rule) => {
    const wcagId = rule.id;
    const violations = wcagViolationMap.get(wcagId) || [];

    if (violations.length > 0) {
      violations.forEach((violation) => {
        const reportEntry = {
          id: wcagId,
          title: rule.title,
        };

        reportEntry.A = rule.level === "A" ? violation.status : null;
        reportEntry.AA = ["A", "AA"].includes(rule.level)
          ? violation.status
          : null;
        reportEntry.AAA = violation.status;
        reportEntry.details = {
          description: violation.description,
          impact: violation.impact,
          ruleId: violation.id,
        };

        report.push(reportEntry);
      });
    } else {
      const reportEntry = {
        id: wcagId,
        title: rule.title,
        A: rule.level === "A" ? "pass" : null,
        AA: ["A", "AA"].includes(rule.level) ? "pass" : null,
        AAA: "pass",
      };

      report.push(reportEntry);
    }
  });

  return report;
}

const fs = require("fs");

try {
  const wcagMapping = JSON.parse(fs.readFileSync("wcag_mapping.json", "utf8"));
  const auditSummary = JSON.parse(fs.readFileSync("axe_report.json", "utf8"));

  const report = generateWcagReport(wcagMapping, auditSummary);

  fs.writeFileSync(
    "wcag_compliance_report.json",
    JSON.stringify(report, null, 2)
  );

  console.log("WCAG compliance report generated successfully!");
  console.log(`Generated ${report.length} report entries.`);
} catch (error) {
  console.error("Error generating WCAG report:", error);
}
