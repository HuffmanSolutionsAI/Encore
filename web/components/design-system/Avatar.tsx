"use client";

import { useState } from "react";
import { BRAND } from "./tokens";

/** Initial avatar — brand-fill circle, Fraunces letter. When a URL is set,
 *  shows the real image and falls back to the initial on a load error. */
export function Avatar({
  name,
  url,
  size = 36,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const letter = name?.trim()?.[0]?.toUpperCase() ?? "·";
  const showImage = !!url && !failed;

  return (
    <div
      className="font-display relative flex items-center justify-center flex-none overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: "var(--e-brand)",
        color: BRAND.paper,
        fontWeight: 600,
        fontSize: size * 0.42,
        lineHeight: 1,
      }}
    >
      <span>{letter}</span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
