import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// iOS home-screen icon (#117): the same 👾 as icon.svg (Twemoji, CC-BY 4.0), on the site's dark
// background, since iOS fills transparency with black. Rendered once at build time.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b0d",
        }}
      >
        <img src={src} width={132} height={132} alt="" />
      </div>
    ),
    size,
  );
}
