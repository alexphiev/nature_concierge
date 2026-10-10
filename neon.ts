import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    placestatus: {
      name: "Place status checker",
      source: "./functions/placestatus/index.ts",
      env: {
        ADMIN_TOKEN: process.env.PLACESTATUS_ADMIN_TOKEN ?? "",
        AI_BASE_URL: process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/",
        AI_API_KEY: process.env.GEMINI_API_KEY ?? "",
        AI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
        MAX_SOURCES_PER_RUN: "50",
        CONCURRENCY: "4",
        AI_MAX_CALLS_PER_RUN: "20",
        AI_MAX_CALLS_PER_DAY: "100",
        BOT_CONTACT_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      },
    },
  },

  triggers: {
    "placestatus-schedule": {
      type: "schedule",
      function: "placestatus",
      // Every 2 h, 04:00-20:00 UTC = 06:00-22:00 Paris in summer, 05:00-21:00 in winter.
      cron: "0 4-20/2 * * *",
      functionPath: "/run",
    },
  },
});
