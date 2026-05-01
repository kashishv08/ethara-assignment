import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const TOKEN_TTL = "7d";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member";
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
  return decoded;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
