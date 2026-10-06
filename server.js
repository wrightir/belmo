const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Playwright hermetic browser installation.
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

// Writable runtime locations for Chromium.
process.env.XDG_CONFIG_HOME = "/tmp/.chromium-config";
process.env.XDG_CACHE_HOME = "/tmp/.chromium-cache";
process.env.BREAKPAD_DUMP_LOCATION = "/tmp/.chromium-crashpad";

// Make sure the runtime directories exist.
fs.mkdirSync(process.env.XDG_CONFIG_HOME, {
  recursive: true
});

fs.mkdirSync(process.env.XDG_CACHE_HOME, {
  recursive: true
});

fs.mkdirSync(process.env.BREAKPAD_DUMP_LOCATION, {
  recursive: true
});

const { chromium } = require("playwright");

const playwrightChromePath = chromium.executablePath();

// Playwright also installs Chrome Headless Shell.
// Derive its path from the installed Chromium version.
let headlessShellPath = null;

const chromiumMatch = playwrightChromePath.match(
  /chromium-(\d+)\/chrome-linux64\/chrome$/
);

if (chromiumMatch) {
  const chromiumVersion = chromiumMatch[1];

  headlessShellPath =
    "/app/node_modules/playwright-core/.local-browsers/" +
    `chromium_headless_shell-${chromiumVersion}/` +
    "chrome-headless-shell-linux64/chrome-headless-shell";
}

console.log("========================================");
console.log("=== Chromium runtime diagnostic ===");
console.log("========================================");

console.log("HOME =", process.env.HOME);
console.log("PORT =", PORT);

console.log(
  "PLAYWRIGHT_BROWSERS_PATH =",
  process.env.PLAYWRIGHT_BROWSERS_PATH
);

console.log(
  "XDG_CONFIG_HOME =",
  process.env.XDG_CONFIG_HOME
);

console.log(
  "XDG_CACHE_HOME =",
  process.env.XDG_CACHE_HOME
);

console.log(
  "BREAKPAD_DUMP_LOCATION =",
  process.env.BREAKPAD_DUMP_LOCATION
);

console.log("");
console.log("Playwright Chromium path:");
console.log(playwrightChromePath);

console.log(
  "Playwright Chromium exists:",
  fs.existsSync(playwrightChromePath)
);

console.log("");
console.log("Chrome Headless Shell path:");
console.log(headlessShellPath);

console.log(
  "Chrome Headless Shell exists:",
  headlessShellPath
    ? fs.existsSync(headlessShellPath)
    : false
);

if (
  headlessShellPath &&
  fs.existsSync(headlessShellPath)
) {
  try {
    const stat = fs.statSync(headlessShellPath);

    console.log(
      "Headless Shell file size:",
      stat.size
    );

    console.log(
      "Headless Shell executable mode:",
      "0" + (stat.mode & 0o777).toString(8)
    );
  } catch (error) {
    console.error("Failed to stat Headless Shell:");
    console.error(error);
  }

  console.log("");
  console.log("Direct Headless Shell execution test:");

  try {
    const output = require("child_process").execFileSync(
      headlessShellPath,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--crash-dumps-dir=/tmp/.chromium-crashpad",
        "--dump-dom",
        "https://example.com"
      ],
      {
        encoding: "utf8",
        timeout: 30000,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    console.log(
      "Direct Headless Shell execution: SUCCESS"
    );

    console.log(
      "Output length:",
      output.length
    );

    console.log(
      "Output preview:",
      output.substring(0, 200)
    );

  } catch (error) {
    console.error(
      "Direct Headless Shell execution: FAILED"
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error code:",
      error.code
    );

    console.error(
      "Signal:",
      error.signal
    );

    if (error.stdout) {
      console.error(
        "stdout:",
        error.stdout.toString().substring(0, 1000)
      );
    }

    if (error.stderr) {
      console.error(
        "stderr:",
        error.stderr.toString().substring(0, 3000)
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

    // Prefer Chrome Headless Shell in the container.
    // It is explicitly installed by Playwright for headless use.
    const executablePath =
      headlessShellPath &&
      fs.existsSync(headlessShellPath)
        ? headlessShellPath
        : playwrightChromePath;

    console.log("Using executablePath:");
    console.log(executablePath);

    console.log(
      "Executable exists:",
      fs.existsSync(executablePath)
    );

    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--crash-dumps-dir=/tmp/.chromium-crashpad"
      ]
    });

    console.log(
      "Chromium started successfully."
    );

    const page = await browser.newPage();

    console.log(
      "Opening test page..."
    );

    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const title = await page.title();
    const url = page.url();

    console.log(
      "Page loaded successfully."
    );

    console.log(
      "Title:",
      title
    );

    console.log(
      "URL:",
      url
    );

    res.json({
      success: true,
      message: "Chromium is working!",
      title,
      url,
      executablePath,
      playwrightExecutablePath:
        playwrightChromePath,
      headlessShellPath
    });

  } catch (error) {
    console.error("");
    console.error("========================================");
    console.error("Chromium test failed");
    console.error("========================================");

    console.error(
      "Error name:",
      error.name
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error stack:",
      error.stack
    );

    res.status(500).json({
      success: false,
      message: "Chromium test failed",
      error: error.message,
      stack: error.stack,
      playwrightExecutablePath:
        playwrightChromePath,
      headlessShellPath,
      filesystem: {
        playwrightExecutableExists:
          fs.existsSync(playwrightChromePath),

        headlessShellExists:
          headlessShellPath
            ? fs.existsSync(headlessShellPath)
            : false,

        configDirectoryExists:
          fs.existsSync(
            process.env.XDG_CONFIG_HOME
          ),

        cacheDirectoryExists:
          fs.existsSync(
            process.env.XDG_CACHE_HOME
          ),

        crashpadDirectoryExists:
          fs.existsSync(
            process.env.BREAKPAD_DUMP_LOCATION
          )
      }
    });

  } finally {
    if (browser) {
      try {
        await browser.close();

        console.log(
          "Chromium closed."
        );

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


app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log("========================================");
    console.log(
      `Server listening on port ${PORT}`
    );
    console.log("========================================");
  }
);
