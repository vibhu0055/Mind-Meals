// =============================================================
// INVENTORY SERVICE
// Centralised helpers for adjusting ingredient stock when meals
// are created, edited, or deleted.
//
// Design rules:
//  - Only today's meals affect inventory (locked meals are frozen)
//  - Updates are differential: only the DELTA is applied, so
//    editing an ingredient multiple times doesn't over-deduct
//  - All operations run inside the caller's DB transaction
// =============================================================

// =============================================================
// DEDUCT INGREDIENTS FROM INVENTORY
// Called when a meal ingredient is added for the first time.
// Fails if stock would go negative (prevents over-use).
// =============================================================
export const deductFromInventory = async (client, school_id, ingredient_id, quantity_g) => {
  const result = await client.query(
    `UPDATE inventory
     SET quantity_g  = quantity_g - $1,
         updated_at  = NOW()
     WHERE school_id    = $2
       AND ingredient_id = $3
       AND quantity_g   >= $1
     RETURNING quantity_g`,
    [quantity_g, school_id, ingredient_id]
  );

  if (result.rows.length === 0) {
    // Either not in inventory at all, or insufficient stock
    const stockRow = await client.query(
      `SELECT quantity_g FROM inventory
       WHERE school_id = $1 AND ingredient_id = $2`,
      [school_id, ingredient_id]
    );
    if (stockRow.rows.length === 0) {
      throw new Error(`Ingredient ${ingredient_id} is not in your inventory. Add it first.`);
    }
    const available = parseFloat(stockRow.rows[0].quantity_g);
    throw new Error(
      `Insufficient stock: need ${quantity_g}g but only ${available}g available for ingredient ${ingredient_id}.`
    );
  }
};

// =============================================================
// RESTORE INGREDIENTS TO INVENTORY
// Called when a meal ingredient is removed or a meal is deleted.
// =============================================================
export const restoreToInventory = async (client, school_id, ingredient_id, quantity_g) => {
  await client.query(
    `INSERT INTO inventory (school_id, ingredient_id, quantity_g, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (school_id, ingredient_id)
     DO UPDATE SET
       quantity_g = inventory.quantity_g + EXCLUDED.quantity_g,
       updated_at = NOW()`,
    [school_id, ingredient_id, quantity_g]
  );
};

// =============================================================
// APPLY DIFFERENTIAL UPDATE
// Called when an existing ingredient's quantity is changed.
// Only the difference (new - old) is applied to inventory,
// so multiple edits don't compound.
//
//  new > old → deduct the extra amount
//  new < old → restore the saved amount
//  new = old → no-op
// =============================================================
export const applyInventoryDelta = async (client, school_id, ingredient_id, oldQty, newQty) => {
  const delta = newQty - oldQty;
  if (delta === 0) return;

  if (delta > 0) {
    // Need more → deduct additional delta from stock
    await deductFromInventory(client, school_id, ingredient_id, delta);
  } else {
    // Need less → restore the freed-up delta back to stock
    await restoreToInventory(client, school_id, ingredient_id, Math.abs(delta));
  }
};

// =============================================================
// RESTORE ALL INGREDIENTS OF A MEAL
// Called when an entire meal is deleted.
// Fetches all meal_ingredients and restores each one.
// =============================================================
export const restoreAllMealIngredients = async (client, school_id, meal_id) => {
  const ingredients = await client.query(
    `SELECT ingredient_id, quantity_g FROM meal_ingredients WHERE meal_id = $1`,
    [meal_id]
  );
  for (const row of ingredients.rows) {
    await restoreToInventory(client, school_id, row.ingredient_id, parseFloat(row.quantity_g));
  }
};