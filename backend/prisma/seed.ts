import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    console.log(
      "SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD not set — skipping bootstrap admin seed.",
    );
    return;
  }

  const MIN_PASSWORD_LENGTH = 12;
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD is too short (min ${MIN_PASSWORD_LENGTH} characters) — ` +
        "refusing to seed a weak first-admin password.",
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash },
  });

  console.log(`Bootstrap admin "${username}" ready.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
