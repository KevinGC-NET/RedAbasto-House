import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "export",
  images: {
    unoptimized: true, // <--- Añade esta línea para solucionar el error
  },
};

export default nextConfig;
