import type { MetadataRoute } from "next";

// Makes Pokebos installable on phones (Add to Home Screen) as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pokebos",
    short_name: "Pokebos",
    description: "Catch Boston on the T",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5EBCD",
    theme_color: "#E84637",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
