import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The mesh, the facility list and the medicines catalogue are read from disk
   * at request time with readFileSync, so Next's tracer cannot see them: there
   * is no import to follow. Without this the pages build fine locally and then
   * fail on the deployed serverless function with ENOENT, which is exactly the
   * kind of thing that gets discovered live on stage.
   *
   * consumption.csv is deliberately not listed. It is 20MB, it is gitignored,
   * and only the offline pipeline reads it.
   */
  outputFileTracingIncludes: {
    "/**": [
      "./data/catalog/**/*.json",
      "./data/generated/facilities.json",
      "./data/generated/mesh_output.json",
      "./data/generated/calibration.json",
    ],
  },
};

export default nextConfig;
