import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/db", async () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { registerUser, verifyUser } from "@/lib/services/users.service";

const mockFindUnique = vi.mocked(db.user.findUnique);
const mockCreate = vi.mocked(db.user.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerUser", () => {
  it("creates a user with a hashed password", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "cuid1",
      username: "alice",
      createdAt: new Date(),
    } as never);

    const result = await registerUser({ username: "alice", password: "password123" });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArg = mockCreate.mock.calls[0][0] as { data: { passwordHash: string } };
    expect(callArg.data.passwordHash).not.toBe("password123");
    expect(result.username).toBe("alice");
  });

  it("normalises username to lowercase", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "cuid2",
      username: "alice",
      createdAt: new Date(),
    } as never);

    await registerUser({ username: "ALICE", password: "password123" });

    const callArg = mockCreate.mock.calls[0][0] as { data: { username: string } };
    expect(callArg.data.username).toBe("alice");
  });

  it("rejects username shorter than 3 characters", async () => {
    await expect(registerUser({ username: "ab", password: "password123" })).rejects.toThrow(
      "Username must be at least 3 characters."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects password shorter than 8 characters", async () => {
    await expect(registerUser({ username: "alice", password: "short" })).rejects.toThrow(
      "Password must be at least 8 characters."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate username with clear error", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" } as never);

    await expect(
      registerUser({ username: "alice", password: "password123" })
    ).rejects.toThrow("Username is already taken.");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("verifyUser", () => {
  it("returns user when credentials are correct", async () => {
    const hash = await bcrypt.hash("password123", 10);
    mockFindUnique.mockResolvedValue({
      id: "cuid1",
      username: "alice",
      passwordHash: hash,
      createdAt: new Date(),
    } as never);

    const result = await verifyUser("alice", "password123");
    expect(result).not.toBeNull();
    expect(result?.username).toBe("alice");
  });

  it("returns null when password is wrong", async () => {
    const hash = await bcrypt.hash("correct-password", 10);
    mockFindUnique.mockResolvedValue({
      id: "cuid1",
      username: "alice",
      passwordHash: hash,
      createdAt: new Date(),
    } as never);

    const result = await verifyUser("alice", "wrong-password");
    expect(result).toBeNull();
  });

  it("returns null when user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await verifyUser("ghost", "password123");
    expect(result).toBeNull();
  });

  it("normalises username to lowercase before lookup", async () => {
    mockFindUnique.mockResolvedValue(null);

    await verifyUser("ALICE", "password123");

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { username: "alice" },
    });
  });
});
