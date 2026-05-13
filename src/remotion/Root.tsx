import { Composition } from "remotion";
import { GenericVideo } from "./GenericVideo";
import { AlgorithmVideo } from "./AlgorithmVideo";
import React from "react";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadOutfit();
loadInter();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GenericVideo"
        component={GenericVideo}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Default Title",
          scenes: [],
          showCaptions: true
        }}
      />
      <Composition
        id="AlgorithmVideo"
        component={AlgorithmVideo}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Default Title",
          array: [],
          steps: [],
          showCaptions: true
        }}
      />
    </>
  );
};
