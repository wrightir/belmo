const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  let browser;

  try {
    console.log("Starting Chromium...");

    browser = await chromium.launch({
      headless: true
    });

    console.log("Chromium started.");

    const page = await browser.newPage();

    console.log("Opening test page...");

    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const title = await page.title();
    const url = page.url();

    console.log("Page loaded.");
    console.log("Title:", title);
    console.log("URL:", url);

    res.json({
      success: true,
      message: "Chromium is working!",
      title,
      url
    });
  } catch (error) {
    console.error("Chromium test failed:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Chromium test failed",
      error: error.message,
      stack: error.stack
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      console.log("Chromium closed.");
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
