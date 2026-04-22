// =============================================================
// Mind-Meals — Meal Management API Test Suite
// =============================================================
// Run:  node test-meal-apis.js
// Make sure the server is running on PORT 5000 first.
// =============================================================

const BASE = 'http://localhost:5000/api';

// ── Colour helpers ────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;

// ── State shared across tests ─────────────────────────────────
const state = {
  schoolToken:   null,
  teacherToken:  null,
  schoolDbId:    null,
  teacherId:     null,
  classIds:      [],           // 4 class IDs  (classes 1–2, 3–4, 5–6, 7–8)
  ingredientIds: [],
  mealId:        null,
};

let passed = 0;
let failed = 0;

// ── HTTP helper ───────────────────────────────────────────────
async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Test runner ───────────────────────────────────────────────
async function test(label, fn) {
  try {
    await fn();
    console.log(GREEN('  ✔') + '  ' + label);
    passed++;
  } catch (err) {
    console.log(RED('  ✘') + '  ' + label);
    console.log(RED(`     → ${err.message}`));
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ── Section header ────────────────────────────────────────────
function section(title) {
  console.log('\n' + BOLD(CYAN(`▶ ${title}`)));
}

// =============================================================
// TEST GROUPS
// =============================================================

// ─────────────────────────────────────────────────────────────
// 0. SETUP — register school, create teacher, create classes
// ─────────────────────────────────────────────────────────────
async function setupPrerequisites() {
  section('SETUP — School, Teacher, Classes, Students');

  // Register school (may already exist — that's fine)
  const uniqueEmail = `testschool_${Date.now()}@mindmeals.test`;
  await test('Register school', async () => {
    const { status, data } = await req('POST', '/school/register', {
      name: 'Test School',
      school_id: Math.floor(Math.random() * 90000) + 10000,
      email: uniqueEmail,
      password: 'school123',
    });
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    state.schoolDbId = data.school.id;
  });

  await test('Login school', async () => {
    const { status, data } = await req('POST', '/school/login', {
      email: uniqueEmail,
      password: 'school123',
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    state.schoolToken = data.token;
    state.schoolDbId  = data.school.id;
  });

  // Create 4 representative classes (one per group boundary)
  const classNames = ['Class 1', 'Class 3', 'Class 5', 'Class 7'];
  for (const name of classNames) {
    await test(`Create class: ${name}`, async () => {
      const { status, data } = await req(
        'POST', '/class/create',
        { name, section: 'A' },
        state.schoolToken
      );
      assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
      state.classIds.push(data.class.id);
    });
  }

  // Create a teacher
  const teacherEmail = `teacher_${Date.now()}@mindmeals.test`;
  await test('Create teacher', async () => {
    const { status, data } = await req(
      'POST', '/teacher/create',
      { name: 'Ms. Test', email: teacherEmail, password: 'teacher123' },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    state.teacherId = data.teacher.id;
  });

  await test('Login teacher', async () => {
    const { status, data } = await req('POST', '/teacher/login', {
      email: teacherEmail,
      password: 'teacher123',
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    state.teacherToken = data.token;
  });

  // Assign teacher to all 4 classes
  for (const classId of state.classIds) {
    await test(`Assign teacher to class ${classId}`, async () => {
      const { status, data } = await req(
        'POST', '/class/assign-teacher',
        { teacher_id: state.teacherId, class_id: classId },
        state.schoolToken
      );
      assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    });
  }

  // Grant teacher meal permission
  await test('Grant teacher meal management permission', async () => {
    const { status, data } = await req(
      'PATCH', `/teacher/${state.teacherId}/meal-permission`,
      { can_manage_meals: true },
      state.schoolToken
    );
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.teacher.can_manage_meals === true, 'Permission not set');
  });

  // Add students to each class (so distribution has real counts)
  const classSizes = [5, 6, 7, 4]; // G1:5, G2:6, G3:7, G4:4
  for (let i = 0; i < state.classIds.length; i++) {
    for (let s = 1; s <= classSizes[i]; s++) {
      await test(`Add student ${s} to class ${state.classIds[i]}`, async () => {
        const { status, data } = await req(
          'POST', '/student/add',
          {
            name: `Student ${s} of Class ${i + 1}`,
            age: 6 + i * 2,
            gender: 'male',
            class_id: state.classIds[i],
          },
          state.teacherToken
        );
        assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 1. INGREDIENTS
// ─────────────────────────────────────────────────────────────
async function testIngredients() {
  section('INGREDIENTS');

  await test('GET /ingredient/ — empty list (no auth) should 401', async () => {
    const { status } = await req('GET', '/ingredient/');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /ingredient/ — authenticated returns list', async () => {
    const { status, data } = await req('GET', '/ingredient/', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.ingredients), 'ingredients should be an array');
  });

  await test('POST /ingredient/ — add Rice', async () => {
    const { status, data } = await req(
      'POST', '/ingredient/',
      {
        name:          'Rice',
        calories_kcal: 130,
        protein_g:     2.7,
        carbs_g:       28.2,
        fat_g:         0.3,
        fiber_g:       0.4,
        iron_mg:       0.2,
        calcium_mg:    10,
        vitamin_a_mcg: 0,
        vitamin_c_mg:  0,
      },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.ingredient.name === 'Rice', 'Name mismatch');
    state.ingredientIds.push(data.ingredient.id);
  });

  await test('POST /ingredient/ — add Dal (lentils)', async () => {
    const { status, data } = await req(
      'POST', '/ingredient/',
      {
        name:          'Dal',
        calories_kcal: 116,
        protein_g:     9,
        carbs_g:       20,
        fat_g:         0.4,
        fiber_g:       7.9,
        iron_mg:       3.3,
        calcium_mg:    19,
        vitamin_a_mcg: 2,
        vitamin_c_mg:  1.5,
      },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    state.ingredientIds.push(data.ingredient.id);
  });

  await test('POST /ingredient/ — add Milk', async () => {
    const { status, data } = await req(
      'POST', '/ingredient/',
      {
        name:          'Milk',
        calories_kcal: 61,
        protein_g:     3.2,
        carbs_g:       4.8,
        fat_g:         3.3,
        fiber_g:       0,
        iron_mg:       0.03,
        calcium_mg:    113,
        vitamin_a_mcg: 46,
        vitamin_c_mg:  0,
      },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    state.ingredientIds.push(data.ingredient.id);
  });

  await test('POST /ingredient/ — duplicate name returns 400', async () => {
    const { status } = await req(
      'POST', '/ingredient/',
      { name: 'Rice', calories_kcal: 130 },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /ingredient/ — missing name returns 400', async () => {
    const { status } = await req(
      'POST', '/ingredient/',
      { calories_kcal: 100 },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('GET /ingredient/:id — fetch single ingredient', async () => {
    const id = state.ingredientIds[0];
    const { status, data } = await req('GET', `/ingredient/${id}`, null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.ingredient.id === id, 'ID mismatch');
  });

  await test('GET /ingredient/9999 — not found returns 404', async () => {
    const { status } = await req('GET', '/ingredient/9999', null, state.schoolToken);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('PATCH /ingredient/:id — update protein_g of Rice', async () => {
    const id = state.ingredientIds[0];
    const { status, data } = await req(
      'PATCH', `/ingredient/${id}`,
      { protein_g: 2.9 },
      state.schoolToken
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(parseFloat(data.ingredient.protein_g) === 2.9, 'protein_g not updated');
  });

  await test('PATCH /ingredient/ — teacher cannot update ingredient', async () => {
    const id = state.ingredientIds[0];
    const { status } = await req(
      'PATCH', `/ingredient/${id}`,
      { protein_g: 99 },
      state.teacherToken
    );
    assert(status === 403, `Expected 403, got ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 2. CLASS GROUPS
// ─────────────────────────────────────────────────────────────
async function testClassGroups() {
  section('CLASS GROUPS');

  await test('GET /class-group/config — no auth, returns group reference', async () => {
    const { status, data } = await req('GET', '/class-group/config');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.groups), 'groups should be array');
    assert(data.groups.length === 4, 'Should have 4 groups');
    const labels = data.groups.map(g => g.group_label);
    assert(labels.includes('G1') && labels.includes('G4'), 'G1 and G4 must exist');
  });

  await test('GET /class-group/ — returns empty before assignment', async () => {
    const { status, data } = await req('GET', '/class-group/', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.class_groups), 'Should be array');
  });

  // Assign classes[0] and classes[1] to G1 and G2 (both are "Class 1" and "Class 3" which represent groups)
  const assignments = [
    { idx: 0, group: 'G1' },
    { idx: 1, group: 'G2' },
    { idx: 2, group: 'G3' },
    { idx: 3, group: 'G4' },
  ];

  for (const { idx, group } of assignments) {
    await test(`Assign class index ${idx} → ${group}`, async () => {
      const { status, data } = await req(
        'POST', '/class-group/assign',
        { class_id: state.classIds[idx], group_label: group },
        state.schoolToken
      );
      assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
      assert(data.class_group.group_label === group, 'Group label mismatch');
    });
  }

  await test('Re-assign class to different group (upsert) works', async () => {
    const { status, data } = await req(
      'POST', '/class-group/assign',
      { class_id: state.classIds[0], group_label: 'G1' },  // same group, just re-confirm
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.class_group.group_label === 'G1', 'Should still be G1');
  });

  await test('Invalid group_label returns 400', async () => {
    const { status } = await req(
      'POST', '/class-group/assign',
      { class_id: state.classIds[0], group_label: 'G9' },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Missing class_id returns 400', async () => {
    const { status } = await req(
      'POST', '/class-group/assign',
      { group_label: 'G1' },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Teacher cannot assign groups', async () => {
    const { status } = await req(
      'POST', '/class-group/assign',
      { class_id: state.classIds[0], group_label: 'G2' },
      state.teacherToken
    );
    assert(status === 403, `Expected 403, got ${status}`);
  });

  await test('GET /class-group/ — now returns 4 mappings', async () => {
    const { status, data } = await req('GET', '/class-group/', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.class_groups.length === 4, `Expected 4, got ${data.class_groups.length}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 3. MEALS — Create & Manage
// ─────────────────────────────────────────────────────────────
async function testMeals() {
  section('MEALS — Create & Manage');

  await test('POST /meal/create — school creates a lunch', async () => {
    const { status, data } = await req(
      'POST', '/meal/create',
      { name: 'Monday Lunch', meal_type: 'lunch', served_date: '2025-06-02' },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.meal.name === 'Monday Lunch', 'Name mismatch');
    state.mealId = data.meal.id;
  });

  await test('POST /meal/create — teacher with permission creates a breakfast', async () => {
    const { status, data } = await req(
      'POST', '/meal/create',
      { name: 'Monday Breakfast', meal_type: 'breakfast', served_date: '2025-06-02' },
      state.teacherToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
  });

  await test('POST /meal/create — missing fields returns 400', async () => {
    const { status } = await req(
      'POST', '/meal/create',
      { name: 'Incomplete Meal' },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /meal/create — unauthenticated returns 401', async () => {
    const { status } = await req('POST', '/meal/create', {
      name: 'x', meal_type: 'lunch', served_date: '2025-06-01',
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('GET /meal/ — returns list of meals', async () => {
    const { status, data } = await req('GET', '/meal/', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.meals), 'meals should be array');
    assert(data.meals.length >= 2, `Expected at least 2 meals, got ${data.meals.length}`);
  });

  await test('GET /meal/?meal_type=lunch — filter by type', async () => {
    const { status, data } = await req('GET', '/meal/?meal_type=lunch', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.meals.every(m => m.meal_type === 'lunch'), 'Non-lunch meals in results');
  });

  await test('GET /meal/?date=2025-06-02 — filter by date', async () => {
    const { status, data } = await req('GET', '/meal/?date=2025-06-02', null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.meals.length >= 1, 'Should find at least 1 meal on that date');
  });

  await test('GET /meal/:id — fetch single meal', async () => {
    const { status, data } = await req(`GET`, `/meal/${state.mealId}`, null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.meal.id === state.mealId, 'ID mismatch');
    assert(Array.isArray(data.ingredients), 'ingredients should be array');
  });

  await test('GET /meal/99999 — not found returns 404', async () => {
    const { status } = await req('GET', '/meal/99999', null, state.schoolToken);
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 4. MEAL INGREDIENTS
// ─────────────────────────────────────────────────────────────
async function testMealIngredients() {
  section('MEAL INGREDIENTS');

  await test('POST /meal/:id/ingredients — add 3 ingredients to meal', async () => {
    const { status, data } = await req(
      'POST', `/meal/${state.mealId}/ingredients`,
      {
        ingredients: [
          { ingredient_id: state.ingredientIds[0], quantity_g: 200 },  // Rice  200g
          { ingredient_id: state.ingredientIds[1], quantity_g: 150 },  // Dal   150g
          { ingredient_id: state.ingredientIds[2], quantity_g: 100 },  // Milk  100g
        ],
      },
      state.schoolToken
    );
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.meal_ingredients.length === 3, `Expected 3, got ${data.meal_ingredients.length}`);
  });

  await test('POST /meal/:id/ingredients — teacher with permission can add', async () => {
    const { status, data } = await req(
      'POST', `/meal/${state.mealId}/ingredients`,
      {
        ingredients: [
          { ingredient_id: state.ingredientIds[0], quantity_g: 250 },  // upsert Rice
        ],
      },
      state.teacherToken
    );
    assert(status === 201, `Expected 201, got ${status}`);
  });

  await test('GET /meal/:id — now shows ingredients attached', async () => {
    const { status, data } = await req('GET', `/meal/${state.mealId}`, null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.ingredients.length >= 3, `Expected >=3 ingredients, got ${data.ingredients.length}`);
  });

  await test('POST /meal/:id/ingredients — invalid ingredient_id returns 404', async () => {
    const { status } = await req(
      'POST', `/meal/${state.mealId}/ingredients`,
      { ingredients: [{ ingredient_id: 99999, quantity_g: 100 }] },
      state.schoolToken
    );
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('POST /meal/:id/ingredients — zero quantity returns 400', async () => {
    const { status } = await req(
      'POST', `/meal/${state.mealId}/ingredients`,
      { ingredients: [{ ingredient_id: state.ingredientIds[0], quantity_g: 0 }] },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /meal/:id/ingredients — empty array returns 400', async () => {
    const { status } = await req(
      'POST', `/meal/${state.mealId}/ingredients`,
      { ingredients: [] },
      state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('POST /meal/99999/ingredients — wrong meal returns 404', async () => {
    const { status } = await req(
      'POST', '/meal/99999/ingredients',
      { ingredients: [{ ingredient_id: state.ingredientIds[0], quantity_g: 100 }] },
      state.schoolToken
    );
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 5. DISTRIBUTION
// ─────────────────────────────────────────────────────────────
async function testDistribution() {
  section('MEAL DISTRIBUTION');

  await test('GET /meal/:id/distribution — before compute returns 404', async () => {
    const { status } = await req(
      'GET', `/meal/${state.mealId}/distribution`,
      null, state.schoolToken
    );
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('POST /meal/:id/distribute — triggers computation successfully', async () => {
    const { status, data } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.schoolToken
    );
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data.distribution), 'distribution should be array');
    assert(data.distribution.length === 4, `Expected 4 groups, got ${data.distribution.length}`);
    assert(data.total_nutrients, 'total_nutrients should be present');
    assert(data.student_counts,  'student_counts should be present');
  });

  await test('Distribution — all 4 groups present (G1–G4)', async () => {
    const { data } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.schoolToken
    );
    const labels = data.distribution.map(d => d.group_label).sort();
    assert(
      JSON.stringify(labels) === JSON.stringify(['G1','G2','G3','G4']),
      `Groups: ${labels}`
    );
  });

  await test('Distribution — per-student nutrients are numbers > 0', async () => {
    const { data } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.schoolToken
    );
    for (const group of data.distribution) {
      assert(
        group.calories_per_student > 0,
        `${group.group_label} calories_per_student should be > 0`
      );
      assert(
        group.protein_per_student > 0,
        `${group.group_label} protein_per_student should be > 0`
      );
    }
  });

  await test('Distribution — G4 gets more per-student than G1 (weight 1.2 vs 0.8)', async () => {
    const { data } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.schoolToken
    );
    const g1 = data.distribution.find(d => d.group_label === 'G1');
    const g4 = data.distribution.find(d => d.group_label === 'G4');
    assert(
      parseFloat(g4.calories_per_student) > parseFloat(g1.calories_per_student),
      `G4 (${g4.calories_per_student}) should > G1 (${g1.calories_per_student})`
    );
  });

  await test('Distribution — student_counts match what we added', async () => {
    const { data } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.schoolToken
    );
    // G1=5, G2=6, G3=7, G4=4 from setup
    const counts = {};
    for (const d of data.distribution) counts[d.group_label] = parseInt(d.student_count);
    assert(counts.G1 === 5, `G1 count: expected 5, got ${counts.G1}`);
    assert(counts.G2 === 6, `G2 count: expected 6, got ${counts.G2}`);
    assert(counts.G3 === 7, `G3 count: expected 7, got ${counts.G3}`);
    assert(counts.G4 === 4, `G4 count: expected 4, got ${counts.G4}`);
  });

  await test('GET /meal/:id/distribution — after compute returns results', async () => {
    const { status, data } = await req(
      'GET', `/meal/${state.mealId}/distribution`,
      null, state.schoolToken
    );
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.distribution.length === 4, 'Should have 4 group rows');
    assert(data.total_nutrients, 'total_nutrients should be present');
    assert(data.meal, 'meal info should be present');
  });

  await test('Distribution is idempotent — re-running gives same result', async () => {
    const { data: run1 } = await req(
      'POST', `/meal/${state.mealId}/distribute`, null, state.schoolToken
    );
    const { data: run2 } = await req(
      'POST', `/meal/${state.mealId}/distribute`, null, state.schoolToken
    );
    const g1run1 = run1.distribution.find(d => d.group_label === 'G1').calories_per_student;
    const g1run2 = run2.distribution.find(d => d.group_label === 'G1').calories_per_student;
    assert(
      parseFloat(g1run1) === parseFloat(g1run2),
      `Idempotency failed: ${g1run1} vs ${g1run2}`
    );
  });

  await test('Teacher with permission can trigger distribution', async () => {
    const { status } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.teacherToken
    );
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('POST /meal/99999/distribute — wrong meal returns 404', async () => {
    const { status } = await req(
      'POST', '/meal/99999/distribute', null, state.schoolToken
    );
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 6. EDGE CASES
// ─────────────────────────────────────────────────────────────
async function testEdgeCases() {
  section('EDGE CASES');

  await test('Distribute meal with no ingredients returns 400', async () => {
    // Create a fresh empty meal
    const { data: mealData } = await req(
      'POST', '/meal/create',
      { name: 'Empty Meal', meal_type: 'snack', served_date: '2025-06-03' },
      state.schoolToken
    );
    const emptyMealId = mealData.meal.id;
    const { status, data } = await req(
      'POST', `/meal/${emptyMealId}/distribute`,
      null, state.schoolToken
    );
    assert(status === 400, `Expected 400, got ${status}: ${JSON.stringify(data)}`);
  });

  await test('Teacher WITHOUT meal permission cannot create meal', async () => {
    // Create a new teacher without permission
    const noPermEmail = `noperm_${Date.now()}@test.com`;
    await req('POST', '/teacher/create',
      { name: 'No Perm', email: noPermEmail, password: 'pass123' },
      state.schoolToken
    );
    const { data: loginData } = await req('POST', '/teacher/login',
      { email: noPermEmail, password: 'pass123' }
    );
    const noPermToken = loginData.token;
    const { status } = await req(
      'POST', '/meal/create',
      { name: 'Blocked Meal', meal_type: 'lunch', served_date: '2025-06-01' },
      noPermToken
    );
    assert(status === 403, `Expected 403, got ${status}`);
  });

  await test('Revoke meal permission — teacher can no longer distribute', async () => {
    await req(
      'PATCH', `/teacher/${state.teacherId}/meal-permission`,
      { can_manage_meals: false },
      state.schoolToken
    );
    const { status } = await req(
      'POST', `/meal/${state.mealId}/distribute`,
      null, state.teacherToken
    );
    assert(status === 403, `Expected 403, got ${status}`);
    // Restore permission for later tests
    await req(
      'PATCH', `/teacher/${state.teacherId}/meal-permission`,
      { can_manage_meals: true },
      state.schoolToken
    );
  });
}

// ─────────────────────────────────────────────────────────────
// 7. CLEANUP — Delete meal, delete ingredient
// ─────────────────────────────────────────────────────────────
async function testCleanup() {
  section('CLEANUP');

  await test('DELETE /meal/:id — school deletes meal', async () => {
    const { status, data } = await req(
      'DELETE', `/meal/${state.mealId}`,
      null, state.schoolToken
    );
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  });

  await test('GET /meal/:id — deleted meal returns 404', async () => {
    const { status } = await req('GET', `/meal/${state.mealId}`, null, state.schoolToken);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('Teacher cannot delete meals', async () => {
    // Create a new meal to try deleting
    const { data } = await req(
      'POST', '/meal/create',
      { name: 'To Delete', meal_type: 'dinner', served_date: '2025-06-04' },
      state.schoolToken
    );
    const { status } = await req(
      'DELETE', `/meal/${data.meal.id}`,
      null, state.teacherToken
    );
    assert(status === 403, `Expected 403, got ${status}`);
    // Clean up
    await req('DELETE', `/meal/${data.meal.id}`, null, state.schoolToken);
  });

  await test('DELETE /ingredient/:id — school deletes Milk', async () => {
    const id = state.ingredientIds[2];
    const { status } = await req('DELETE', `/ingredient/${id}`, null, state.schoolToken);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /ingredient/:id — deleted ingredient returns 404', async () => {
    const id = state.ingredientIds[2];
    const { status } = await req('GET', `/ingredient/${id}`, null, state.schoolToken);
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// =============================================================
// MAIN
// =============================================================
async function main() {
  console.log(BOLD('\n╔══════════════════════════════════════════════╗'));
  console.log(BOLD('║   Mind-Meals  Meal API Test Suite            ║'));
  console.log(BOLD('╚══════════════════════════════════════════════╝'));

  try {
    await setupPrerequisites();
    await testIngredients();
    await testClassGroups();
    await testMeals();
    await testMealIngredients();
    await testDistribution();
    await testEdgeCases();
    await testCleanup();
  } catch (err) {
    console.error(RED(`\nFatal error in test runner: ${err.message}`));
  }

  // ── Summary ──────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n' + BOLD('─'.repeat(50)));
  console.log(BOLD(`Results: ${total} tests`));
  console.log(GREEN(`  ✔ Passed: ${passed}`));
  if (failed > 0) {
    console.log(RED(`  ✘ Failed: ${failed}`));
  } else {
    console.log(GREEN(`  ✘ Failed: 0`));
  }
  console.log(BOLD('─'.repeat(50)));

  if (failed > 0) process.exit(1);
}

main();