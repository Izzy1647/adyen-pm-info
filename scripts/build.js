const { execSync } = require("child_process");
const path = require("path");

const scriptsDir = __dirname;

console.log("=== Step 1: Fetching fresh data from Adyen ===\n");
execSync(`node ${path.join(scriptsDir, "fetchData.js")}`, { stdio: "inherit" });

console.log("\n=== Step 2: Generating HTML ===\n");
execSync(`node ${path.join(scriptsDir, "generateHtml.js")}`, { stdio: "inherit" });

console.log("\n=== Build complete! ===");
