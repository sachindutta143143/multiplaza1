const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const targetDir = path.join(rootDir, "GITHUB-READY-FILES");

console.log("============================================================");
console.log("  Multi Plaza - Preparing GitHub Upload Files");
console.log("============================================================");
console.log();

// 1. Remove old target directory if exists
if (fs.existsSync(targetDir)) {
  console.log("Cleaning previous GITHUB-READY-FILES folder...");
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// 2. Filter rules
const IGNORED_NAMES = new Set([
  "node_modules",
  ".next",
  "data",
  ".git",
  "GITHUB-READY-FILES",
  "backups",
]);

let fileCount = 0;

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      if (IGNORED_NAMES.has(item)) continue;
      if (item.startsWith(".env") && item !== ".env.example") continue;
      if (item.endsWith(".log") || item.endsWith(".tmp")) continue;

      const subSrc = path.join(src, item);
      const subDst = path.join(dst, item);
      copyRecursive(subSrc, subDst);
    }
  } else {
    fs.copyFileSync(src, dst);
    fileCount++;
  }
}

console.log("Copying project files (excluding node_modules, .next, etc.)...");
copyRecursive(rootDir, targetDir);

console.log();
console.log("============================================================");
console.log(`  [SUCCESS] Total ${fileCount} files prepared!`);
console.log("  This is well below GitHub's 100-file limit.");
console.log("============================================================");
console.log();
console.log("NEXT STEPS:");
console.log("1. Open your repository on GitHub.com in your browser.");
console.log("2. Click 'uploading an existing file' (or Add file -> Upload files).");
console.log("3. In the GITHUB-READY-FILES folder that just opened:");
console.log("   Press Ctrl + A (select all files & folders).");
console.log("4. Drag & drop them into the GitHub page in your browser.");
console.log("5. Click 'Commit changes' at the bottom. Done!");
console.log("============================================================");
console.log();

// Open target directory in Windows Explorer (or Mac/Linux finder)
if (process.platform === "win32") {
  exec(`explorer.exe "${targetDir}"`);
} else if (process.platform === "darwin") {
  exec(`open "${targetDir}"`);
}
