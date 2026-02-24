import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth, requireHousehold } from "../../middleware/auth.js";
import { refreshAndPersistItem } from "../items/items.service.js";

interface RecipeEntry {
  name: string;
  ingredients: string[];
  shortSteps: string[];
  timeEstimate: string;
}

function tokenizeIngredientCandidates(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export const recipesRouter = Router();

function loadRecipes(): RecipeEntry[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const jsonPath = path.resolve(__dirname, "../../data/recipes.json");
  const content = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(content) as RecipeEntry[];
}

recipesRouter.get(
  "/suggestions",
  requireAuth,
  requireHousehold,
  asyncHandler(async (req, res) => {
    const activeItems = await prisma.item.findMany({
      where: {
        householdId: req.membership!.householdId,
        archivedAt: null
      }
    });

    const refreshed = await Promise.all(activeItems.map((item) => refreshAndPersistItem(prisma, item)));
    const useSoon = refreshed.filter((item) => item.status === "USE_SOON");
    const keywords = new Set<string>();
    for (const item of useSoon) {
      tokenizeIngredientCandidates(item.name).forEach((part) => keywords.add(part));
      keywords.add(item.category.toLowerCase());
    }

    const suggestions = loadRecipes()
      .map((recipe) => {
        const matchedIngredients = recipe.ingredients.filter((ingredient) =>
          keywords.has(ingredient.toLowerCase())
        );
        return {
          ...recipe,
          matchedIngredients,
          matchCount: matchedIngredients.length
        };
      })
      .filter((recipe) => recipe.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 6)
      .map((recipe) => ({
        name: recipe.name,
        matchedIngredients: recipe.matchedIngredients,
        shortSteps: recipe.shortSteps,
        timeEstimate: recipe.timeEstimate
      }));

    res.json({ suggestions });
  })
);
