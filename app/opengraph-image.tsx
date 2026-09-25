import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/src/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          width: "100%",
          height: "100%",
          padding: 64,
          background: "#FAF7F0",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 600, color: "#1C2B33" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#0F4C5C" }}>
          Où aller en nature entre Marseille et Bandol — et où ne pas aller.
        </div>
      </div>
    ),
    { ...size },
  );
}
