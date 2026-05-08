import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

async function fetchRandomGif(): Promise<string> {
  const page = Math.floor(Math.random() * 10) + 1;

  const res = await fetch(
    `https://api.klipy.com/api/v1/1voc5xDgnKY9i7T9sYDarp43PDCoqeEE1tS7Eaa7wBLciTgwsRk9eLCO0xtlozwS/gifs/search?q=GM&page=${page}&customer_id=snap`
  );

  const json = await res.json();

  const gif = json?.data?.data?.[0];

  if (!gif?.file?.md?.gif?.url) {
    throw new Error("Invalid GIF structure");
  }

  return gif.file.md.gif.url;
}

const SNAP_URL = "https://snapapps.vercel.app/gmfarcaster";

registerSnapHandler(app, async (ctx): Promise<SnapHandlerResult> => {
  const said =
    new URL(ctx.request.url).searchParams.get("said") === "1";

  try {
    const gif = await fetchRandomGif();

    return {
      version: "1.0",
      theme: { accent: "amber" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: {
              direction: "vertical",
              gap: "md",
              align: "center",
            },
            children: said
              ? ["title", "gifImage", "btnRowAfter"]
              : ["title", "gifImage", "btnBefore"],
          },
          title: {
            type: "text",
            props: {
              content: "GM Farcaster 🌞",
              size: "md",
              weight: "bold",
              align: "center",
            },
          },
          gifImage: {
            type: "image",
            props: {
              src: gif,
              aspectRatio: "1:1",
            },
          },
          btnBefore: {
            type: "button",
            props: {
              label: "Say GM",
              variant: "primary",
            },
            on: {
              press: {
                action: "submit",
                params: {
                  target: `${SNAP_URL}?said=1`,
                },
              },
            },
          },
          btnRowAfter: {
            type: "stack",
            props: {
              direction: "horizontal",
              gap: "sm",
              justify: "center",
            },
            children: ["retryBtn", "shareBtn"],
          },
          retryBtn: {
            type: "button",
            props: {
              label: "Retry",
              variant: "primary",
            },
            on: {
              press: {
                action: "submit",
                params: {
                  target: `${SNAP_URL}?said=1`,
                },
              },
            },
          },
          shareBtn: {
            type: "button",
            props: {
              label: "Share",
              variant: "secondary",
              icon: "share",
            },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: `GM Farcaster 🌞/n/nGenerate yours here 👇/n${SNAP_URL}`,
                  embeds: [gif],
                },
              },
            },
          },
        },
      },
    };
  } catch {
    return {
      version: "1.0",
      theme: { accent: "amber" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "text",
            props: {
              content: "Couldn't load GM GIF 🌞",
              align: "center",
            },
          },
        },
      },
    };
  }
});

export default app;
