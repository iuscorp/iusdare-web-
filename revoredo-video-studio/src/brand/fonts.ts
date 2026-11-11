import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { fonts } from "./tokens";

/**
 * Fonts are bundled locally (public/brand/fonts) so renders never depend on
 * network access and every render is identical.
 */
const faces: { family: string; file: string; weight: string; style: string }[] = [
  { family: fonts.serif, file: "instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
  { family: fonts.serif, file: "instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  { family: fonts.serif, file: "instrument-serif-latin-ext-400-normal.woff2", weight: "400", style: "normal" },
  { family: fonts.serif, file: "instrument-serif-latin-ext-400-italic.woff2", weight: "400", style: "italic" },
  { family: fonts.sans, file: "lato-latin-300-normal.woff2", weight: "300", style: "normal" },
  { family: fonts.sans, file: "lato-latin-400-normal.woff2", weight: "400", style: "normal" },
  // Lato has no 500/600: map them to 700 so existing weights render bold.
  { family: fonts.sans, file: "lato-latin-700-normal.woff2", weight: "500 700", style: "normal" },
  { family: fonts.sans, file: "lato-latin-900-normal.woff2", weight: "900", style: "normal" },
  { family: fonts.sans, file: "lato-latin-ext-300-normal.woff2", weight: "300", style: "normal" },
  { family: fonts.sans, file: "lato-latin-ext-400-normal.woff2", weight: "400", style: "normal" },
  { family: fonts.sans, file: "lato-latin-ext-700-normal.woff2", weight: "500 700", style: "normal" },
];

let loaded: Promise<unknown> | null = null;

export const loadBrandFonts = () => {
  if (!loaded) {
    loaded = Promise.all(
      faces.map((f) =>
        loadFont({
          family: f.family,
          url: staticFile(`brand/fonts/${f.file}`),
          weight: f.weight,
          style: f.style,
        }),
      ),
    );
  }
  return loaded;
};

loadBrandFonts();
