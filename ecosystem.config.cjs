module.exports = {
  apps: [
    {
      name: "human-vs-ai-game",
      cwd: "/home/vishva/Projects/human_vs_ai_game",
      // Run the Next.js production server directly (matches the npm `start` →
      // `next start` script, but invoked via the binary so PM2 controls it cleanly).
      // Runtime secrets (DATABASE_URL, Pusher, ElevenLabs) are loaded by Next.js
      // from .env.production automatically when NODE_ENV=production.
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4182",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: "4182",
      },
    },
  ],
};
