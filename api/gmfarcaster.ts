import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

function getRandomPage(max = 5) {
  return Math.floor(Math.random() * max) + 1;
}

async function fetchRandomGif(): Promise<string> {
  const page = getRandomPage(100); 

  const res = await fetch(
    `https://api.klipy.com/api/v1/1voc5xDgnKY9i7T9sYDarp43PDCoqeEE1tS7Eaa7wBLciTgwsRk9eLCO0xtlozwS/gifs/search?q=GM&per_page=20&page=${page}&customer_id=snap`
  );

  const json = await res.json();

  const gifs = json?.data?.data;
  if (!gifs || gifs.length === 0) {
    throw new Error("No GIFs found");
  }

  const randomIndex = Math.floor(Math.random() * gifs.length);
  const selected = gifs[randomIndex];

  return selected.file.md.webp.url;
}

/* -------------------- SNAP HANDLER -------------------- */
registerSnapHandler(app, async (ctx): Promise<SnapHandlerResult> => {
  const url = new URL(ctx.request.url);
  const base = url.origin;
  const said = url.searchParams.get("said") === "1";

  // Initial screen
  if (ctx.action.type !== "post" || !said) {
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
              justify: "center",
              align: "center",
            },
            children: ["title", "gmBtn"],
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
          gmBtn: {
            type: "button",
            props: {
              label: "Say GM",
              variant: "primary",
            },
            on: {
              press: {
                action: "submit",
                params: {
                  target: `${base}/gm?said=1`,
                },
              },
            },
          },
        },
      },
    };
  }

  // After clicking Say GM
  try {
    const gif = await fetchRandomGif();

    const shareText = `GM Farcaster 🌞\n\nSnap by @weak`;

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
              justify: "center",
              align: "center",
            },
            children: ["gifImage", "btnRow"],
          },
          gifImage: {
            type: "image",
            props: {
              src: gif,
              aspectRatio: "1:1",
            },
          },
          btnRow: {
            type: "stack",
            props: {
              direction: "horizontal",
              gap: "sm",
              justify: "center",
            },
            children: ["shareBtn", "againBtn"],
          },
          shareBtn: {
            type: "button",
            props: {
              label: "Share",
              variant: "primary",
              icon: "share",
            },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: shareText,
                  embeds: [gif],
                },
              },
            },
          },
          againBtn: {
            type: "button",
            props: {
              label: "Another GM",
              variant: "secondary",
            },
            on: {
              press: {
                action: "submit",
                params: {
                  target: `${base}/gm?said=1`,
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
            type: "stack",
            props: {
              direction: "vertical",
              gap: "md",
              justify: "center",
              align: "center",
            },
            children: ["errorText", "retryBtn"],
          },
          errorText: {
            type: "text",
            props: {
              content: "Couldn't load GM GIF. Try again 🌞",
              align: "center",
            },
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
                  target: `${base}/gm?said=1`,
                },
              },
            },
          },
        },
      },
    };
  }
});

export default app;
