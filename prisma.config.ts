import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  db: {
    provider: "sqlite",
    url: "file:./dev.db",
  },
});
