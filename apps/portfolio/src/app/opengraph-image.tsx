import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

// Generated at build time; also used as the Twitter card image.
export const alt = `${profile.name}: ${profile.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#09090b",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 32, color: "#5eead4" }}>josuedev.dpdns.org</div>
        <div style={{ fontSize: 88, fontWeight: 700, marginTop: 16 }}>{profile.name}</div>
        <div style={{ fontSize: 40, color: "#d4d4d8", marginTop: 16 }}>{profile.headline}</div>
      </div>
    ),
    size,
  );
}
