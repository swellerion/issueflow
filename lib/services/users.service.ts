import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export type RegisterInput = {
  username: string;
  password: string;
};

export type SafeUser = {
  id: string;
  username: string;
  createdAt: Date;
};

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const username = input.username.trim().toLowerCase();
  const { password } = input;

  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error("Username is already taken.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await db.user.create({
    data: { username, passwordHash },
    select: { id: true, username: true, createdAt: true },
  });

  return user;
}

export async function getUsers() {
  return db.user.findMany({
    select: { id: true, username: true, isSuperAdmin: true },
    orderBy: { username: "asc" },
  });
}

export async function getUserByUsername(username: string) {
  return db.user.findUnique({
    where: { username },
    select: { id: true, username: true, isSuperAdmin: true },
  });
}

export async function getUserFlags(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
}

export async function verifyUser(
  username: string,
  password: string
): Promise<SafeUser | null> {
  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, username: user.username, createdAt: user.createdAt };
}
