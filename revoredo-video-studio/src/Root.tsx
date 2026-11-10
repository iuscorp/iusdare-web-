import React from "react";
import { Composition } from "remotion";
import { RevoredoReel, calculateReelMetadata, reelSchema, type ReelProps } from "./templates/RevoredoReel";
import { LibraryShowcase, SHOWCASE_ITEM_FRAMES } from "./templates/LibraryShowcase";
import plantilla from "../projects/_plantilla/edit.json";

/**
 * Compositions
 *  - RevoredoReel     the edit engine. Rendered per project with --props
 *                     (scripts/render.ts injects projects/<slug>/edit.json).
 *  - LibraryShowcase  review reel of the motion-graphics library.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RevoredoReel"
        component={RevoredoReel}
        schema={reelSchema}
        defaultProps={{ edit: plantilla, hud: false } as ReelProps}
        calculateMetadata={calculateReelMetadata}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LibraryShowcase"
        component={LibraryShowcase}
        durationInFrames={SHOWCASE_ITEM_FRAMES * 8}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
