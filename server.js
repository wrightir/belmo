const express = require("express");
const fs = require("fs");
const { execFileSync } = require("child_process");

// IMPORTANT:
// Use Playwright's hermetic browser installation location:
// /app/node_modules/playwright-core/.local-browsers
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

// Let Playwright determine the actual installed Chromium path.
// This avoids hard-coding chromium-1243.
const chromePath = chromium.executablePath();

console.log("========================================");
console.log("=== Chromium runtime diagnostic ===");
console.log("========================================");

console.log("HOME =", process.env.HOME);
console.log("PORT =", PORT);
console.log(
  "PLAYWRIGHT_BROWSERS_PATH =",
  process.env.PLAYWRIGHT_BROWSERS_PATH
);

console.log("");
console.log("Playwright executablePath:");
console.log(chromium.executablePath());

console.log("");
console.log("Actual Chrome path:");
console.log(chromePath);

console.log("");
console.log("Filesystem checks:");

console.log(
  "Chrome executable exists:",
  fs.existsSync(chromePath)
);

if (fs.existsSync(chromePath)) {
  try {
    const stat = fs.statSync(chromePath);

    console.log("Chrome file size:", stat.size);

    console.log(
      "Chrome executable mode:",
      "0" + (stat.mode & 0o777).toString(8)
    );
  } catch (error) {
    console.error("Failed to stat Chrome:");
    console.error(error);
  }

  console.log("");
  console.log("Direct Chrome execution test:");

  try {
    const output = execFileSync(
      chromePath,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--dump-dom",
        "https://example.com"
      ],
      {
        encoding: "utf8",
        timeout: 30000,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    console.log("Direct Chrome execution: SUCCESS");
    console.log("Output length:", output.length);

    console.log(
      "Output preview:",
      output.substring(0, 200)
    );

  } catch (error) {
    console.error("Direct Chrome execution: FAILED");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Signal:", error.signal);

    if (error.stdout) {
      console.error(
        "stdout:",
        error.stdout.toString().substring(0, 1000)
      );
    }

    if (error.stderr) {
      console.error(
        "stderr:",
        error.stderr.toString().substring(0, 2000)
      );
    }
  }
}

console.log("========================================");
console.log("=== End runtime diagnostic ===");
console.log("========================================");


app.get("/", async (req, res) => {
  let browser;

  try {
    console.log("");
    console.log("========================================");
    console.log("Starting Playwright Chromium...");
    console.log("========================================");

    console.log("Using explicit executablePath:");
    console.log(chromePath);

    console.log(
      "Executable exists:",
      fs.existsSync(chromePath)
    );

    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        "--no-sandbox",
        "--disable-gpu"
      ]
    });

    console.log("Chromium started successfully.");

    const page = await browser.newPage();

    console.log("Opening test page...");

    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const title = await page.title();
    const url = page.url();

    console.log("Page loaded successfully.");
    console.log("Title:", title);
    console.log("URL:", url);

    res.json({
      success: true,
      message: "Chromium is working!",
      title,
      url,
      executablePath: chromePath
    });

  } catch (error) {
    console.error("");
    console.error("========================================");
    console.error("Chromium test failed");
    console.error("========================================");

    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Chromium test failed",
      error: error.message,
      stack: error.stack,
      executablePath: chromePath,
      filesystem: {
        executableExists: fs.existsSync(chromePath)
      }
    });

  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("Chromium closed.");
      } catch (error) {
        console.error(
          "Failed to close Chromium:",
          error.message
        );
      }
    }
  }
});


app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok"
  });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("========================================");
  console.log(`Server listening on port ${PORT}`);
  console.log("========================================");
});
