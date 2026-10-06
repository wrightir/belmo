const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const { execFileSync } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("========================================");
console.log("=== Chromium runtime diagnostic ===");
console.log("========================================");

console.log("HOME =", process.env.HOME);
console.log("PORT =", PORT);

const cacheDir = "/root/.cache/ms-playwright";

const chromiumDir =
  "/root/.cache/ms-playwright/chromium_headless_shell-1243";

const chromiumPath =
  "/root/.cache/ms-playwright/chromium_headless_shell-1243/" +
  "chrome-headless-shell-linux64/chrome-headless-shell";

console.log("");
console.log("Playwright executablePath:");
console.log(chromium.executablePath());

console.log("");
console.log("Filesystem checks:");

console.log(
  "Playwright cache exists:",
  fs.existsSync(cacheDir)
);

console.log(
  "Chromium directory exists:",
  fs.existsSync(chromiumDir)
);

console.log(
  "Chromium executable exists:",
  fs.existsSync(chromiumPath)
);

if (fs.existsSync(chromiumPath)) {
  try {
    const stat = fs.statSync(chromiumPath);

    console.log("Chromium file size:", stat.size);
    console.log(
      "Chromium executable mode:",
      "0" + (stat.mode & 0o777).toString(8)
    );
  } catch (error) {
    console.error("Failed to stat Chromium:");
    console.error(error);
  }

  console.log("");
  console.log("Direct Chromium execution test:");

  try {
    const output = execFileSync(
      chromiumPath,
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

    console.log("Direct Chromium execution: SUCCESS");
    console.log("Output length:", output.length);
    console.log(
      "Output preview:",
      output.substring(0, 200)
    );
  } catch (error) {
    console.error("Direct Chromium execution: FAILED");
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

    console.log(
      "Playwright executablePath:",
      chromium.executablePath()
    );

    browser = await chromium.launch({
      headless: true
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
      executablePath: chromium.executablePath()
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
      executablePath: chromium.executablePath(),
      filesystem: {
        cacheExists: fs.existsSync(cacheDir),
        chromiumDirExists: fs.existsSync(chromiumDir),
        executableExists: fs.existsSync(chromiumPath)
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
