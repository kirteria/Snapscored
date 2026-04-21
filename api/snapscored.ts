import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

async function fetchNeynarScore(fid: number) {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) throw new Error("Missing NEYNAR_API_KEY");

  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    { headers: { "x-api-key": apiKey } }
  );

  const data = (await res.json()) as {
    users: Array<{ score: number }>;
  };

  const user = data.users?.[0];
  if (!user) throw new Error("User not found");

  return user.score ?? 0;
}

function scoreTier(score: number): string {
  if (score >= 0.9) return "Excellent! You're Diamond";
  if (score >= 0.7) return "Awesome! You're Gold";
  if (score >= 0.5) return "Nice! You're Silver";
  if (score >= 0.3) return "Keep going! You're Bronze";
  if (score >= 0.1) return "Growing! You're Sprout";
  return "Welcome Newcomer!";
}


registerSnapHandler(app, async (ctx): Promise<SnapHandlerResult> => {
  const url = new URL(ctx.request.url);
  const base = url.origin;
  const checked = url.searchParams.get("checked") === "1";

  if (ctx.action.type !== "post" || !checked) {
    return {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "subtitle", "checkBtn"],
          },
          title: {
            type: "text",
            props: { content: "Neynar Score Checker", size: "md", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: { content: "Are you a Diamond or Newcomer?", size: "sm", align: "center" },
          },
          checkBtn: {
            type: "button",
            props: { label: "Check Me", variant: "primary" },
            on: { press: { action: "submit", params: { target: `${base}/?checked=1` } } },
          },
        },
      },
    };
  }

  try {
    const score = await fetchNeynarScore(ctx.action.user.fid);
    const tier = scoreTier(score);
    const scoreDisplay = score.toFixed(2);
    const shareText = `${tier.replace("You're", "I'm")} with a score of ${scoreDisplay} / 1.0\n\nSnap by @weak`;

    return {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md", justify: "center" },
            children: ["tierLine", "scoreLine", "btnRow"],
          },
          tierLine: {
            type: "text",
            props: { content: `${tier}`, size: "md", weight: "bold", align: "center" },
          },
          scoreLine: {
            type: "text",
            props: { content: `${scoreDisplay} / 1.0`, size: "md", align: "center" },
          },
          btnRow: {
            type: "stack",
            props: { direction: "horizontal", gap: "sm", justify: "center" },
            children: ["shareBtn", "retryBtn"],
          },
          shareBtn: {
            type: "button",
            props: { label: "Share", variant: "primary", icon: "share" },
            on: {
              press: {
                action: "compose_cast",
                params: { text: shareText, embeds: [`${base}/`] },
              },
            },
          },
          retryBtn: {
            type: "button",
            props: { label: "Retry", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: `${base}/?checked=1` } } },
          },
        },
      },
    };
  } catch {
    return {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["errorMsg", "retryBtn"],
          },
          errorMsg: {
            type: "text",
            props: { content: "Couldn't load your score. Try again.", size: "sm", align: "center" },
          },
          retryBtn: {
            type: "button",
            props: { label: "Retry", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: `${base}/?checked=1` } } },
          },
        },
      },
    };
  }
});

export default app;
