import { describe, expect, it } from "vitest";
import { fitWithin, MAX_IMAGE_EDGE } from "./image-resize";

describe("fitWithin", () => {
  it("leaves images within the limit unchanged", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("scales a 4K landscape photo to the maximum edge", () => {
    expect(fitWithin(3840, 2160)).toEqual({ width: MAX_IMAGE_EDGE, height: 1152 });
  });

  it("scales portrait photos by their height", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: MAX_IMAGE_EDGE });
  });
});
