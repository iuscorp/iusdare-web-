/**
 * Remotion CLI config (studio / `npx remotion render|still`).
 * The Node scripts in scripts/ pass the same options to the renderer API.
 * All configuration options: https://remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";
import fs from "node:fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
Config.setConcurrency(null);

// Use a local Chromium when present (cloud sessions / offline machines).
const candidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
].filter(Boolean) as string[];
const browser = candidates.find((p) => fs.existsSync(p));
if (browser) Config.setBrowserExecutable(browser);
