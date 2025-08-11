import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
  }),
});

const albums = defineCollection({
  loader: glob({ base: "./src/content/albums", pattern: "**/*.yaml" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    artist: z.string(),
    year: z.number(),
    cover: z.string(),
    backCover: z.string().optional(),
    tracks: z.array(z.object({
      title: z.string(),
      file: z.string(),
      durationSec: z.number().optional(),
    })),
    videos: z.array(z.object({
      title: z.string(),
      file: z.string(),
      poster: z.string().optional(),
    })).optional(),
    gallery: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, albums };
