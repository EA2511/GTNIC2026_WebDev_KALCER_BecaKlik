import { PrismaClient } from "@prisma/client";

// Di mode development, Next.js me-reload kode berkali-kali.
// Tanpa trik ini, setiap reload membuat koneksi database baru
// dan lama-lama MySQL penuh ("too many connections").
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
