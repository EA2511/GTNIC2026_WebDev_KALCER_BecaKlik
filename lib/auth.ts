import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "lajukota_session";
const SESSION_DURATION = 60 * 60 * 24 * 7;

export type SessionData = {
  userId: number;
  nama: string;
  role: Role;
  exp: number;
  email?: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diisi atau kurang dari 32 karakter.");
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(data: Omit<SessionData, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...data,
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) return null;

    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionData;

    const validRoles: Role[] = ["ADMIN", "DRIVER", "PENUMPANG"];

    if (
      !Number.isInteger(data.userId) ||
      data.userId <= 0 ||
      typeof data.nama !== "string" ||
      !validRoles.includes(data.role) ||
      typeof data.exp !== "number" ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function setSession(
  data: Omit<SessionData, "exp">,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createSessionToken(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  return verifySessionToken(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
