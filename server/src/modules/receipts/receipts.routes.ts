import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { requireAuth, requireHousehold } from "../../middleware/auth.js";
import { env } from "../../config/env.js";

const TABSCANNER_BASE = "https://api.tabscanner.com";
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 16; // ~40 seconds

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  }
});

interface TabScannerLineItem {
  descClean?: string;
  desc?: string;
  lineType?: string;
  qty?: number;
  unitPrice?: number;
}

interface TabScannerResult {
  lineItems?: TabScannerLineItem[];
  establishment?: string;
  date?: string;
}

export interface ScannedItem {
  name: string;
  category: string;
  quantity: string;
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/\b(milk|cheese|yogurt|butter|cream|kefir|whey)\b/.test(lower)) return "dairy";
  if (/\b(chicken|beef|pork|fish|salmon|tuna|shrimp|turkey|lamb|bacon|sausage|steak|deli)\b/.test(lower)) return "meat";
  if (/\b(bread|bagel|muffin|croissant|roll|bun|loaf|tortilla|wrap|pita)\b/.test(lower)) return "bread";
  if (/\b(apple|banana|lettuce|spinach|tomato|carrot|onion|pepper|broccoli|kale|berry|berries|orange|lemon|grape|avocado|potato|garlic|mushroom|cucumber|zucchini)\b/.test(lower)) return "produce";
  if (/\b(juice|soda|water|tea|coffee|beer|wine|lemonade|drink|sparkling)\b/.test(lower)) return "beverages";
  if (/\b(pasta|rice|flour|oat|oatmeal|grain|cereal|noodle|quinoa|barley|couscous)\b/.test(lower)) return "grains";
  if (/\b(chip|cookie|cracker|snack|candy|chocolate|pretzel|popcorn|nut|nuts)\b/.test(lower)) return "snacks";
  if (/\b(sauce|ketchup|mustard|mayo|mayonnaise|dressing|vinegar|oil|pickle|salsa)\b/.test(lower)) return "condiments";
  if (/\b(frozen|ice cream|nugget|waffle)\b/.test(lower)) return "frozen";
  return "other";
}

function formatQuantity(item: TabScannerLineItem): string {
  if (item.qty && item.qty > 1) return `${item.qty} units`;
  return "1 unit";
}

async function submitToTabScanner(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimetype }), filename);

  const res = await fetch(`${TABSCANNER_BASE}/api/2.0/process`, {
    method: "POST",
    headers: { apikey: env.TABSCANNER_API_KEY! },
    body: form
  });

  if (!res.ok) {
    throw new AppError(`TabScanner submission failed: ${res.status}`, 502);
  }

  const data = (await res.json()) as { success?: boolean; token?: string; message?: string };
  if (!data.success || !data.token) {
    throw new AppError(data.message ?? "TabScanner did not return a token", 502);
  }
  return data.token;
}

async function pollTabScanner(token: string): Promise<TabScannerResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${TABSCANNER_BASE}/api/result/${token}`, {
      headers: { apikey: env.TABSCANNER_API_KEY! }
    });

    if (!res.ok) throw new AppError(`TabScanner poll failed: ${res.status}`, 502);

    const data = (await res.json()) as { status?: string; result?: TabScannerResult; message?: string };

    if (data.status === "done" && data.result) return data.result;
    if (data.status === "failed") throw new AppError("TabScanner processing failed", 502);
  }
  throw new AppError("Receipt processing timed out", 504);
}

export const receiptsRouter = Router();

receiptsRouter.post(
  "/scan",
  requireAuth,
  requireHousehold,
  upload.single("receipt"),
  asyncHandler(async (req, res) => {
    if (!env.TABSCANNER_API_KEY) {
      throw new AppError("TabScanner API key is not configured", 503);
    }
    if (!req.file) {
      throw new AppError("No receipt image provided", 400);
    }

    const token = await submitToTabScanner(req.file.buffer, req.file.mimetype, req.file.originalname || "receipt.jpg");
    const result = await pollTabScanner(token);

    const items: ScannedItem[] = (result.lineItems ?? [])
      .filter((li) => li.lineType === "product" || !li.lineType)
      .map((li) => {
        const name = (li.descClean ?? li.desc ?? "").trim();
        return { name, category: guessCategory(name), quantity: formatQuantity(li) };
      })
      .filter((item) => item.name.length > 1);

    res.json({ items, store: result.establishment ?? null, date: result.date ?? null });
  })
);
