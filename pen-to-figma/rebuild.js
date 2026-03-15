#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const PEN_DATA_FILE = path.join(__dirname, "pen-data.json");
const TEMPLATE_FILE = path.join(__dirname, "code-template.js");
const OUTPUT_FILE = path.join(__dirname, "code.js");

if (!fs.existsSync(PEN_DATA_FILE)) {
  console.error("pen-data.json not found. Run export first.");
  process.exit(1);
}

const penData = JSON.parse(fs.readFileSync(PEN_DATA_FILE, "utf-8"));
console.log(`Loaded ${penData.length} top-level frames from pen-data.json`);

function findImageUrls(obj) {
  const urls = new Set();
  const json = JSON.stringify(obj);
  const re = /"url":"([^"]+\.png)"/g;
  let m;
  while ((m = re.exec(json)) !== null) {
    urls.add(m[1]);
  }
  return urls;
}

const imageUrls = findImageUrls(penData);
console.log(`Found ${imageUrls.size} unique image URLs`);

const imageMap = {};
let imageCount = 0;
let totalBytes = 0;

for (const url of imageUrls) {
  const cleanUrl = url.replace(/\\u0027/g, "'");
  const key = path.basename(cleanUrl, ".png");
  try {
    const buf = fs.readFileSync(cleanUrl);
    imageMap[key] = buf.toString("base64");
    imageCount++;
    totalBytes += buf.length;
    console.log(`  ✓ ${key} (${Math.round(buf.length / 1024)}KB)`);
  } catch (e) {
    console.log(`  ✗ ${key}: ${e.message}`);
  }
}

console.log(`\nEncoded ${imageCount} images (${Math.round(totalBytes / 1024)}KB total)`);

function replaceImageUrlsWithKeys(obj) {
  const json = JSON.stringify(obj);
  const replaced = json.replace(/"url":"([^"]+\.png)"/g, (match, url) => {
    const key = path.basename(url, ".png");
    return `"imageKey":"${key}"`;
  });
  return JSON.parse(replaced);
}

const processedData = replaceImageUrlsWithKeys(penData);

let template = fs.readFileSync(TEMPLATE_FILE, "utf-8");

template = template.replace(
  'var IMAGE_MAP = "__IMAGE_MAP_PLACEHOLDER__";',
  "var IMAGE_MAP = " + JSON.stringify(imageMap) + ";"
);

template = template.replace(
  'var PEN_DATA = "__PEN_DATA_PLACEHOLDER__";',
  "var PEN_DATA = " + JSON.stringify(processedData) + ";"
);

fs.writeFileSync(OUTPUT_FILE, template, "utf-8");
const outSize = fs.statSync(OUTPUT_FILE).size;
console.log(`\nWrote ${OUTPUT_FILE}`);
console.log(`code.js size: ${Math.round(outSize / 1024)}KB (${Math.round(outSize / (1024 * 1024))}MB)`);
console.log("\nDone! Import plugin in Figma:");
console.log("  1. Plugins → Development → Import plugin from manifest...");
console.log("  2. Select: " + path.join(__dirname, "manifest.json"));
console.log("  3. Run: Plugins → Development → Pen to Figma Importer");
