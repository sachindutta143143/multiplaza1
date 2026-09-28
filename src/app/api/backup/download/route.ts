import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSessionFromRequest } from "@/lib/auth";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filename = req.nextUrl.searchParams.get("filename") || "";
  // Strict whitelist: no path traversal
  if (!/^multiplaza-backup-[\w-]+\.json$/.test(filename)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }
  const filePath = path.join(BACKUP_DIR, filename);
  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
