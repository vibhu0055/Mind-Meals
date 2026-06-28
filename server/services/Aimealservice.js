// =============================================================
// AI MEAL SUGGESTION SERVICE
// Uses Google Gemini to generate 3 meal options based on:
//  - School's current inventory (available ingredients + stock)
//  - School's student RDA baseline (age/gender weighted average)
//  - PM-POSHAN lunch targets (calories + protein per student)
//  - Total student count (to compute total quantity needed)
//
// CHANGE 1: DB cache — results stored in meal_suggestions_cache.
//   Gemini is only called if no cache exists for today.
//   Cache is invalidated when inventory changes.
//
// CHANGE 3: Native JSON mode — generationConfig forces Gemini
//   to return raw JSON matching a strict responseSchema.
// =============================================================

import { GoogleGenerativeAI, SchemaType as Type } from '@google/generative-ai';
import pool from '../database/database.js';
import { computeSchoolRdaBaseline } from './mealService.js';

let apireqs = 0;

const PM_POSHAN_TARGETS = {
  calories: 575,
  protein:  16,
};

const LUNCH_FRACTION = 0.40;

// =============================================================
// NATIVE GEMINI RESPONSE SCHEMA
// This guarantees the shape and data types of the returning JSON.
// =============================================================
const mealSuggestionsSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      description: "List of exactly 3 distinct Indian meal options.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the meal option." },
          description: { type: Type.STRING, description: "A one-line description summarizing the dish structure and why it meets nutritional needs." },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingredient_id: { type: Type.INTEGER, description: "The exact matching ingredient database ID number." },
                display_name: { type: Type.STRING },
                quantity_g: { type: Type.INTEGER, description: "The calculated sum weight requirement for the entire student count." }
              },
              required: ["ingredient_id", "display_name", "quantity_g"]
            }
          },
          estimated_per_student: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.INTEGER },
              protein: { type: Type.NUMBER },
              iron: { type: Type.NUMBER },
              calcium: { type: Type.INTEGER },
              fiber: { type: Type.NUMBER }
            },
            required: ["calories", "protein", "iron", "calcium", "fiber"]
          },
          pm_poshan_calories_pct: { type: Type.NUMBER, description: "Percentage of PM-POSHAN calorie target met." },
          pm_poshan_protein_pct: { type: Type.NUMBER, description: "Percentage of PM-POSHAN protein target met." }
        },
        required: [
          "name", 
          "description", 
          "ingredients", 
          "estimated_per_student", 
          "pm_poshan_calories_pct", 
          "pm_poshan_protein_pct"
        ]
      }
    }
  },
  required: ["suggestions"]
};

// =============================================================
// BUILD GEMINI PROMPT
// =============================================================
const buildPrompt = (inventory, studentCount, rdaBaseline) => {
  const lunchRda = {
    calories: Math.round(rdaBaseline.calories * LUNCH_FRACTION),
    protein:  Math.round(rdaBaseline.protein  * LUNCH_FRACTION * 10) / 10,
    iron:     Math.round(rdaBaseline.iron     * LUNCH_FRACTION * 10) / 10,
    calcium:  Math.round(rdaBaseline.calcium  * LUNCH_FRACTION),
    fiber:    Math.round(rdaBaseline.fiber    * LUNCH_FRACTION * 10) / 10,
  };

  const inventoryLines = inventory.map(item =>
    `- ${item.display_name} (id:${item.ingredient_id}): ${item.quantity_g}g available | ` +
    `per 100g → ${item.calories_per_100g} kcal, ${item.protein_per_100g}g protein, ` +
    `${item.iron_mg_per_100g}mg iron, ${item.calcium_mg_per_100g}mg calcium, ` +
    `${item.fiber_per_100g}g fiber`
  ).join('\n');

  return `You are a school nutrition planner for an Indian government school under the PM-POSHAN mid-day meal scheme.

SCHOOL DATA:
- Total students: ${studentCount}
- Average student RDA for lunch (40% of daily requirement):
  Calories: ${lunchRda.calories} kcal/student
  Protein: ${lunchRda.protein}g/student
  Iron: ${lunchRda.iron}mg/student
  Calcium: ${lunchRda.calcium}mg/student
  Fiber: ${lunchRda.fiber}g/student

PM-POSHAN GOVERNMENT TARGETS (minimum per student for lunch):
  Calories: ${PM_POSHAN_TARGETS.calories} kcal
  Protein: ${PM_POSHAN_TARGETS.protein}g

AVAILABLE INVENTORY (only use these ingredients, don't exceed available quantities):
${inventoryLines}

TASK:
Generate exactly 3 different Indian meal suggestions for today's school lunch.
Each meal must:
1. Use ONLY ingredients from the inventory above
2. Not exceed available stock quantities (quantities are for the WHOLE school, ${studentCount} students)
3. Meet or get close to PM-POSHAN targets per student (${PM_POSHAN_TARGETS.calories} kcal, ${PM_POSHAN_TARGETS.protein}g protein)
4. Be practical for a school kitchen (simple dishes, common combinations)
5. Be varied — don't repeat the same main ingredient across all 3 options
6. Quantities should be for the ENTIRE school (all ${studentCount} students combined)

You must output data structured exactly matching the provided JSON schema.`;
};

// =============================================================
// CHECK CACHE
// Returns today's cached suggestions if they exist, else null.
// =============================================================
const getCachedSuggestions = async (school_id) => {
  const result = await pool.query(
    `SELECT suggestions, student_count, rda_baseline, generated_at
     FROM meal_suggestions_cache
     WHERE school_id = $1
       AND cache_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`,
    [school_id]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
};

// =============================================================
// SAVE TO CACHE
// Upserts one row per school per day.
// =============================================================
const saveSuggestionsToCache = async (school_id, suggestions, studentCount, rdaBaseline) => {
  await pool.query(
    `INSERT INTO meal_suggestions_cache
       (school_id, cache_date, suggestions, student_count, rda_baseline, generated_at)
     VALUES (
       $1,
       (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
       $2, $3, $4, NOW()
     )
     ON CONFLICT (school_id, cache_date)
     DO UPDATE SET
       suggestions   = EXCLUDED.suggestions,
       student_count = EXCLUDED.student_count,
       rda_baseline  = EXCLUDED.rda_baseline,
       generated_at  = NOW()`,
    [school_id, JSON.stringify(suggestions), studentCount, JSON.stringify(rdaBaseline)]
  );
};

// =============================================================
// GENERATE MEAL SUGGESTIONS
// Cache-first: only calls Gemini when no cache exists for today.
// Pass forceRefresh = true to bypass cache (e.g. after inventory
// is updated mid-day).
// =============================================================
export const generateMealSuggestions = async (school_id, forceRefresh = false) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');

  // 1. Return cached result if available
  if (!forceRefresh) {
    const cached = await getCachedSuggestions(school_id);
    if (cached) {
      return {
        from_cache:        true,
        generated_at:      cached.generated_at,
        student_count:     cached.student_count,
        rda_baseline:      cached.rda_baseline,
        pm_poshan_targets: PM_POSHAN_TARGETS,
        suggestions:       typeof cached.suggestions === 'string' ? JSON.parse(cached.suggestions) : cached.suggestions,
      };
    }
  }

  // Live calculation block on Cache Miss:
  
  // Fetch Live Inventory
  const inventoryRes = await pool.query(
    `SELECT
        inv.ingredient_id,
        inv.quantity_g,
        i.display_name,
        i.category,
        n.calories_per_100g,
        n.protein_per_100g,
        n.carbs_per_100g,
        n.fat_per_100g,
        n.fiber_per_100g,
        n.iron_mg_per_100g,
        n.calcium_mg_per_100g
     FROM inventory inv
     JOIN ingredients i  ON inv.ingredient_id = i.id
     JOIN ingredient_nutrition n ON i.id = n.ingredient_id
     WHERE inv.school_id = $1 AND inv.quantity_g > 0
     ORDER BY i.category, i.display_name`,
    [school_id]
  );

  if (inventoryRes.rows.length === 0) {
    throw new Error('No ingredients in inventory. Please add stock before requesting suggestions.');
  }

  // Fetch Live Student Count
  const countRes = await pool.query(
    `SELECT COUNT(*) AS total FROM students WHERE school_id = $1`,
    [school_id]
  );
  const studentCount = parseInt(countRes.rows[0].total);
  if (studentCount === 0) {
    throw new Error('No students found. Please add students before requesting meal suggestions.');
  }

  // Calculate Weighted RDA Baseline
  const rdaBaseline = await computeSchoolRdaBaseline(school_id);

  // Generate content using Gemini SDK with Schema Compiler
  const prompt = buildPrompt(inventoryRes.rows, studentCount, rdaBaseline);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: mealSuggestionsSchema,
    },
  });
 // Counter for API requests

  const result = await model.generateContent(prompt);
  console.log("Api request:", ++apireqs);
  const text   = result.response.text().trim();

  // Parse directly; the schema setup rules out random property mutations or formatting syntax errors
  const parsed = JSON.parse(text);

  // Safety filter verification mapping to current database constraints
  const validIds = new Set(inventoryRes.rows.map(r => r.ingredient_id));
  for (const suggestion of parsed.suggestions) {
    suggestion.ingredients = suggestion.ingredients.filter(ing =>
      validIds.has(ing.ingredient_id)
    );
  }

  // Save parsed payload back down to data layer
  await saveSuggestionsToCache(school_id, parsed.suggestions, studentCount, rdaBaseline);

  return {
    from_cache:        false,
    generated_at:      new Date().toISOString(),
    student_count:     studentCount,
    rda_baseline:      rdaBaseline,
    pm_poshan_targets: PM_POSHAN_TARGETS,
    suggestions:       parsed.suggestions,
  };
};

// =============================================================
// INVALIDATE CACHE
// Called by inventoryController whenever stock is updated.
// =============================================================
export const invalidateSuggestionsCache = async (school_id) => {
  await pool.query(
    `DELETE FROM meal_suggestions_cache
     WHERE school_id = $1
       AND cache_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`,
    [school_id]
  );
};