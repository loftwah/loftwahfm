import type { APIRoute } from "astro";
export const prerender = false;

function guessContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".webmanifest")) return "application/manifest+json";
  return "application/octet-stream";
}

function parseRangeHeader(
  rangeHeader: string,
  size: number,
): { start: number; end: number } | null {
  // Expected format: bytes=start-end
  if (!rangeHeader?.startsWith("bytes=")) return null;
  const spec = rangeHeader.replace("bytes=", "").trim();
  const [startStr, endStr] = spec.split("-");
  let start: number | undefined = startStr ? Number(startStr) : undefined;
  let end: number | undefined = endStr ? Number(endStr) : undefined;

  if (Number.isNaN(start as number) && Number.isNaN(end as number)) return null;

  if (start === undefined && end !== undefined) {
    // suffix range: last N bytes
    const lastN = end;
    if (Number.isNaN(lastN) || lastN <= 0) return null;
    start = Math.max(0, size - lastN);
    end = size - 1;
  } else {
    if (start === undefined) start = 0;
    if (end === undefined || end >= size) end = size - 1;
    if (start < 0 || start > end || start >= size) return null;
  }

  return { start: start!, end: end! };
}

export const GET: APIRoute = async ({ params, request, locals }) => {
  const keyParam = params.key as string | undefined;
  if (!keyParam) return new Response("Not Found", { status: 404 });
  // Normalize and defensively decode percent-encoding
  const rawKey = keyParam.replace(/^\/+/, "");
  const decodedKey = safeDecodeURIComponent(rawKey);

  const env: any = (locals as any)?.runtime?.env;
  const bucket: R2Bucket | undefined = (env as any)?.MEDIA as any;
  if (!bucket)
    return new Response("R2 binding not configured", { status: 500 });

  const resolved = await resolveExistingKey(bucket, decodedKey);
  if (!resolved) return new Response("Not Found", { status: 404 });
  const { key, head } = resolved;

  const size: number = head.size ?? 0;
  const etag: string =
    head.httpEtag ||
    head.etag ||
    `W/"${size}-${head.uploaded?.getTime?.() ?? 0}"`;
  const lastModified: string | undefined =
    head.uploaded instanceof Date
      ? head.uploaded.toUTCString()
      : head.uploaded
        ? new Date(head.uploaded).toUTCString()
        : undefined;
  const contentType: string =
    head.httpMetadata?.contentType || guessContentType(key);

  // Conditional request via ETag
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (
    ifNoneMatch &&
    ifNoneMatch.replace(/W\//, "") === etag.replace(/W\//, "")
  ) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        ...(lastModified ? { "Last-Modified": lastModified } : {}),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  const rangeHeader = request.headers.get("Range");
  const acceptRanges = { "Accept-Ranges": "bytes" } as const;

  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...acceptRanges,
          ETag: etag,
          ...(lastModified ? { "Last-Modified": lastModified } : {}),
          "Cache-Control": "public, max-age=86400, immutable",
          "Content-Range": `bytes */${size}`,
        },
      });
    }

    const { start, end } = range;
    const length = end - start + 1;
    const obj = await bucket.get(key, { range: { offset: start, length } });
    if (!obj || !obj.body) return new Response("Not Found", { status: 404 });

    return new Response(obj.body as ReadableStream, {
      status: 206,
      headers: {
        ...acceptRanges,
        ETag: etag,
        ...(lastModified ? { "Last-Modified": lastModified } : {}),
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(length),
      },
    });
  }

  // Full body
  const obj = await bucket.get(key);
  if (!obj || !obj.body) return new Response("Not Found", { status: 404 });

  return new Response(obj.body as ReadableStream, {
    status: 200,
    headers: {
      ...acceptRanges,
      ETag: etag,
      ...(lastModified ? { "Last-Modified": lastModified } : {}),
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": contentType,
      ...(size ? { "Content-Length": String(size) } : {}),
    },
  });
};

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function resolveExistingKey(
  bucket: R2Bucket,
  desiredKey: string,
): Promise<{ key: string; head: R2Object } | null> {
  // Try several key variants to be resilient to prefix differences between environments
  const candidates: string[] = [];
  const noLead = desiredKey.replace(/^\/+/, "");
  const withoutMedia = noLead.replace(/^media\//, "");

  // 1) exact (decoded) path after /media/
  candidates.push(noLead);
  // 2) with media/ prefix
  candidates.push(`media/${withoutMedia}`);
  // 3) stripped media/ if present
  if (noLead.startsWith("media/")) candidates.push(withoutMedia);

  for (const candidate of dedupe(candidates)) {
    const head = await bucket.head(candidate);
    if (head) return { key: candidate, head };
  }
  return null;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
