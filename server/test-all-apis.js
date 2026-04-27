// =============================================================
// Mind-Meals — Complete Backend Test Suite
// =============================================================
// FIRST TIME SETUP (run in this order):
//   1. node scripts/migrateIngredients.js   (adds display_name/category cols)
//   2. node scripts/migrateRDA.js           (recreates rda_reference table)
//   3. node index.js                         (server — also seeds RDA on start)
//   4. node scripts/importIFCTjson.js        (seeds 127 ingredients)
//   5. node test-all-apis.js                 (run tests)
//
// After first time: just  node index.js  then  node test-all-apis.js
// =============================================================

const BASE = 'http://localhost:5000/api';
const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const C = s => `\x1b[36m${s}\x1b[0m`;
const B = s => `\x1b[1m${s}\x1b[0m`;

const S = {
  schoolToken: null, teacherToken: null,
  schoolId:    null, teacherId:    null,
  classIds: [],      studentIds:   [],
  ingredientId: null, mealId:      null,
};
let passed = 0, failed = 0, skipped = 0;

async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function test(label, fn) {
  try {
    await fn();
    console.log(G('  ✔') + '  ' + label);
    passed++;
  } catch (e) {
    console.log(R('  ✘') + '  ' + label);
    console.log(R(`     → ${e.message}`));
    failed++;
  }
}

async function skipTest(label, reason) {
  console.log(Y('  ⊘') + '  ' + label + Y(` (skipped — ${reason})`));
  skipped++;
}

function section(title) { console.log('\n' + B(C(`▶ ${title}`))); }

function haltIfNoToken(which) {
  if (!S[which]) {
    console.log(R(`\n  ❌ HALT: ${which} is null — auth failed above. Fix errors then re-run.\n`));
    process.exit(1);
  }
}

// =============================================================
// 1. SCHOOL AUTH
// =============================================================
async function testSchoolAuth() {
  section('SCHOOL AUTH');
  const email     = `school_${Date.now()}@test.com`;
  const school_id = Math.floor(Date.now() / 1000) % 9000000 + 1000000; // INT

  await test('Register school  POST /api/school/register', async () => {
    const { status, data } = await api('POST', '/school/register',
      { name: 'Sunshine Primary', school_id, email, password: 'school123' });
    assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    S.schoolId = data.school?.id;
  });

  await test('Register — duplicate email → 400', async () => {
    const { status } = await api('POST', '/school/register',
      { name: 'Dup', school_id: school_id + 1, email, password: 'school123' });
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Register — missing school_id → 400', async () => {
    const { status } = await api('POST', '/school/register',
      { name: 'X', email: `x${Date.now()}@t.com`, password: 'abc123' });
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Login school  POST /api/school/login', async () => {
    const { status, data } = await api('POST', '/school/login', { email, password: 'school123' });
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    S.schoolToken = data.token;
    assert(S.schoolToken, 'Token must be in response');
  });

  await test('Login — wrong password → 401', async () => {
    const { status } = await api('POST', '/school/login', { email, password: 'wrongpassword' });
    assert(status === 401, `Expected 401 got ${status}`);
  });

  await test('Login — unknown email → 404', async () => {
    const { status } = await api('POST', '/school/login', { email: 'nobody@x.com', password: 'abc' });
    assert(status === 404, `Expected 404 got ${status}`);
  });

  haltIfNoToken('schoolToken');
}

// =============================================================
// 2. TEACHER
// =============================================================
async function testTeacher() {
  section('TEACHER');
  const email = `teacher_${Date.now()}@test.com`;

  await test('Create teacher  POST /api/teacher/create', async () => {
    const { status, data } = await api('POST', '/teacher/create',
      { name: 'Ms. Priya', email, password: 'teacher123' }, S.schoolToken);
    assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    S.teacherId = data.teacher?.id;
    assert(S.teacherId, 'teacher.id must be present');
  });

  await test('Create teacher — duplicate email → 400', async () => {
    const { status } = await api('POST', '/teacher/create',
      { name: 'Dup', email, password: 'teacher123' }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Create teacher — missing fields → 400', async () => {
    const { status } = await api('POST', '/teacher/create',
      { name: 'No email' }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Login teacher  POST /api/teacher/login', async () => {
    const { status, data } = await api('POST', '/teacher/login', { email, password: 'teacher123' });
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    S.teacherToken = data.token;
    assert(S.teacherToken, 'Token must be present');
  });

  await test('Login teacher — wrong password → 401', async () => {
    const { status } = await api('POST', '/teacher/login', { email, password: 'wrongpassword' });
    assert(status === 401, `Expected 401 got ${status}`);
  });

  await test('List teachers  GET /api/teacher/', async () => {
    const { status, data } = await api('GET', '/teacher/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(Array.isArray(data.teachers) && data.teachers.length >= 1, 'Must have teachers');
  });

  await test('Teacher profile  GET /api/teacher/me', async () => {
    // Route is /me not /profile
    const { status } = await api('GET', '/teacher/me', null, S.teacherToken);
    assert(status === 200, `Expected 200 got ${status}`);
  });

  await test('Grant meal permission  PATCH /api/teacher/:id/meal-permission', async () => {
    const { status, data } = await api('PATCH', `/teacher/${S.teacherId}/meal-permission`,
      { can_manage_meals: true }, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    assert(data.teacher?.can_manage_meals === true, 'Permission must be true');
  });

  await test('No token → 401', async () => {
    const { status } = await api('GET', '/teacher/');
    assert(status === 401, `Expected 401 got ${status}`);
  });

  haltIfNoToken('teacherToken');
}

// =============================================================
// 3. CLASSES & CLASS GROUPS
// =============================================================
async function testClasses() {
  section('CLASSES & CLASS GROUPS');

  const classDefs = [
    { name: 'Class 1', section: 'A', group: 'G1' },
    { name: 'Class 3', section: 'A', group: 'G2' },
    { name: 'Class 5', section: 'A', group: 'G3' },
    { name: 'Class 7', section: 'A', group: 'G4' },
  ];

  for (const c of classDefs) {
    await test(`Create ${c.name}`, async () => {
      const { status, data } = await api('POST', '/class/create',
        { name: c.name, section: c.section }, S.schoolToken);
      assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
      S.classIds.push(data.class?.id);
    });
  }

  await test('Create class — missing name → 400', async () => {
    const { status } = await api('POST', '/class/create', {}, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('List classes  GET /api/class/', async () => {
    const { status, data } = await api('GET', '/class/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.classes?.length >= 4, `Expected ≥4, got ${data.classes?.length}`);
  });

  // ── Assign teacher to ALL 4 classes so they can add students ──────────────
  for (let i = 0; i < S.classIds.length; i++) {
    await test(`Assign teacher to class index ${i}`, async () => {
      const { status, data } = await api('POST', '/class/assign-teacher',
        { teacher_id: S.teacherId, class_id: S.classIds[i] }, S.schoolToken);
      assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    });
  }

  for (let i = 0; i < classDefs.length; i++) {
    await test(`Assign ${classDefs[i].name} → ${classDefs[i].group}`, async () => {
      const { status, data } = await api('POST', '/class-group/assign',
        { class_id: S.classIds[i], group_label: classDefs[i].group }, S.schoolToken);
      assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    });
  }

  await test('Invalid group label → 400', async () => {
    const { status } = await api('POST', '/class-group/assign',
      { class_id: S.classIds[0], group_label: 'G9' }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Teacher cannot assign groups → 403', async () => {
    const { status } = await api('POST', '/class-group/assign',
      { class_id: S.classIds[0], group_label: 'G1' }, S.teacherToken);
    assert(status === 403, `Expected 403 got ${status}`);
  });

  await test('Get class groups  GET /api/class-group/', async () => {
    const { status, data } = await api('GET', '/class-group/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.class_groups?.length >= 4, 'Should have 4 mappings');
  });

  await test('Get group config (no auth)  GET /api/class-group/config', async () => {
    const { status, data } = await api('GET', '/class-group/config');
    assert(status === 200, `Expected 200 got ${status}`);
    assert(Array.isArray(data.groups) && data.groups.length === 4, 'Should have 4 groups');
  });
}

// =============================================================
// 4. STUDENTS
// =============================================================
async function testStudents() {
  section('STUDENTS');

  // Teacher is now assigned to ALL 4 classes
  const batches = [
    { classIdx: 0, count: 5, age: 7,  gender: 'male'   },
    { classIdx: 1, count: 6, age: 9,  gender: 'female' },
    { classIdx: 2, count: 7, age: 10, gender: 'male'   },
    { classIdx: 3, count: 4, age: 13, gender: 'female' },
  ];

  for (const b of batches) {
    for (let n = 1; n <= b.count; n++) {
      await test(`Add student ${n} to class index ${b.classIdx}`, async () => {
        const { status, data } = await api('POST', '/student/add',
          { name: `Student ${n} Cls${b.classIdx+1}`, age: b.age, gender: b.gender, class_id: S.classIds[b.classIdx] },
          S.teacherToken);
        assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
        if (b.classIdx === 2 && n === 1) S.studentIds.push(data.student?.id);
      });
    }
  }

  await test('Add student — missing class_id → 400', async () => {
    const { status } = await api('POST', '/student/add', { name: 'X', age: 10 }, S.teacherToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('List all students  GET /api/student/', async () => {
    const { status, data } = await api('GET', '/student/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.students?.length >= 22, `Expected ≥22, got ${data.students?.length}`);
  });

  await test('Students by class  GET /api/student/class/:id', async () => {
    const { status, data } = await api('GET', `/student/class/${S.classIds[2]}`, null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.students?.length === 7, `Expected 7, got ${data.students?.length}`);
  });

  await test('Get single student  GET /api/student/:id', async () => {
    const { status } = await api('GET', `/student/${S.studentIds[0]}`, null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
  });
}

// =============================================================
// 5. HEALTH RECORDS
// Response keys: POST→ {record}, GET list→ {records}, GET latest→ {record}
// =============================================================
async function testHealth() {
  section('HEALTH RECORDS');

  await test('Record health  POST /api/health/', async () => {
    const { status, data } = await api('POST', '/health/',
      { student_id: S.studentIds[0], height_cm: 138, weight_kg: 28.5, muac_cm: 18.2 },
      S.teacherToken);
    assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    // Controller returns key: 'record'
    assert(data.record?.bmi, `BMI must be calculated. Got: ${JSON.stringify(data)}`);
    assert(data.record?.bmi_category, 'BMI category must be set');
    console.log(`     BMI: ${data.record.bmi} → ${data.record.bmi_category}`);
  });

  await test('Health — missing weight → 400', async () => {
    const { status } = await api('POST', '/health/',
      { student_id: S.studentIds[0], height_cm: 138 }, S.teacherToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Latest health  GET /api/health/latest/:id', async () => {
    // Controller returns key: 'record'
    const { status, data } = await api('GET', `/health/latest/${S.studentIds[0]}`, null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    assert(data.record?.bmi, `BMI must exist. Got: ${JSON.stringify(data)}`);
  });

  await test('All health records  GET /api/health/student/:id', async () => {
    // Controller returns key: 'records'
    const { status, data } = await api('GET', `/health/student/${S.studentIds[0]}`, null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    assert(data.records?.length >= 1, `Must have records. Got: ${JSON.stringify(data)}`);
  });
}

// =============================================================
// 6. INGREDIENTS
// =============================================================
async function testIngredients() {
  section('INGREDIENTS');

  await test('List ingredients  GET /api/ingredient/', async () => {
    const { status, data } = await api('GET', '/ingredient/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(Array.isArray(data.ingredients), 'Must be array');
    if (data.ingredients.length === 0) {
      console.log(Y('     ⚠  No ingredients! Run: node scripts/importIFCTjson.js'));
    } else {
      S.ingredientId = data.ingredients[0]?.id;
      console.log(`     ${data.ingredients.length} ingredients from IFCT 2017 ✓`);
    }
  });

  if (S.ingredientId) {
    await test('Get single ingredient  GET /api/ingredient/:id', async () => {
      const { status } = await api('GET', `/ingredient/${S.ingredientId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
    });
  } else {
    await skipTest('Get single ingredient', 'no ingredients loaded');
  }

  await test('Ingredient not found → 404', async () => {
    const { status } = await api('GET', '/ingredient/99999', null, S.schoolToken);
    assert(status === 404, `Expected 404 got ${status}`);
  });
}

// =============================================================
// 7. MEALS
// =============================================================
async function testMeals() {
  section('MEALS');

  await test('Create meal (school)  POST /api/meal/create', async () => {
    const { status, data } = await api('POST', '/meal/create',
      { name: 'Monday Lunch', meal_type: 'lunch', served_date: '2025-06-02' }, S.schoolToken);
    assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    S.mealId = data.meal?.id;
    assert(S.mealId, 'meal.id must be present');
  });

  await test('Create meal (teacher with permission)', async () => {
    const { status } = await api('POST', '/meal/create',
      { name: 'Monday Breakfast', meal_type: 'breakfast', served_date: '2025-06-02' }, S.teacherToken);
    assert(status === 201, `Expected 201 got ${status}`);
  });

  await test('Create meal — missing fields → 400', async () => {
    const { status } = await api('POST', '/meal/create', { name: 'Incomplete' }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('List meals  GET /api/meal/', async () => {
    const { status, data } = await api('GET', '/meal/', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.meals?.length >= 2, 'Should have meals');
  });

  await test('Filter by meal_type  GET /api/meal/?meal_type=lunch', async () => {
    const { status, data } = await api('GET', '/meal/?meal_type=lunch', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.meals?.every(m => m.meal_type === 'lunch'), 'All must be lunch');
  });

  await test('Filter by date  GET /api/meal/?date=2025-06-02', async () => {
    const { status, data } = await api('GET', '/meal/?date=2025-06-02', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.meals?.length >= 1, 'Must find meals on that date');
  });

  await test('Get single meal  GET /api/meal/:id', async () => {
    const { status, data } = await api('GET', `/meal/${S.mealId}`, null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}`);
    assert(data.meal?.id === S.mealId, 'ID mismatch');
  });

  await test('Meal not found → 404', async () => {
    const { status } = await api('GET', '/meal/99999', null, S.schoolToken);
    assert(status === 404, `Expected 404 got ${status}`);
  });

  await test('Teacher cannot delete meal → 403', async () => {
    const { status } = await api('DELETE', `/meal/${S.mealId}`, null, S.teacherToken);
    assert(status === 403, `Expected 403 got ${status}`);
  });
}

// =============================================================
// 8. MEAL INGREDIENTS
// =============================================================
async function testMealIngredients() {
  section('MEAL INGREDIENTS');

  if (!S.ingredientId) {
    await skipTest('Add ingredient to meal', 'run importIFCTjson.js first');
    await skipTest('Add second ingredient', 'run importIFCTjson.js first');
    await skipTest('Meal shows ingredients after add', 'run importIFCTjson.js first');
  } else {
    await test('Add ingredient to meal  POST /api/meal/:id/ingredients', async () => {
      const { status, data } = await api('POST', `/meal/${S.mealId}/ingredients`,
        { ingredients: [{ ingredient_id: S.ingredientId, quantity_g: 5000 }] }, S.schoolToken);
      assert(status === 201, `Expected 201 got ${status}: ${JSON.stringify(data)}`);
    });

    const allIng = await api('GET', '/ingredient/', null, S.schoolToken);
    const second = allIng.data.ingredients?.find(i => i.id !== S.ingredientId);
    if (second) {
      await test('Add second ingredient', async () => {
        const { status } = await api('POST', `/meal/${S.mealId}/ingredients`,
          { ingredients: [{ ingredient_id: second.id, quantity_g: 2000 }] }, S.schoolToken);
        assert(status === 201, `Expected 201 got ${status}`);
      });
    }

    await test('Meal now shows attached ingredients', async () => {
      const { status, data } = await api('GET', `/meal/${S.mealId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      assert(data.ingredients?.length >= 1, 'Must have ingredients attached');
    });
  }

  await test('Invalid ingredient_id → 404', async () => {
    const { status } = await api('POST', `/meal/${S.mealId}/ingredients`,
      { ingredients: [{ ingredient_id: 99999, quantity_g: 100 }] }, S.schoolToken);
    assert(status === 404, `Expected 404 got ${status}`);
  });

  await test('Zero quantity → 400', async () => {
    const id = S.ingredientId || 1;
    const { status } = await api('POST', `/meal/${S.mealId}/ingredients`,
      { ingredients: [{ ingredient_id: id, quantity_g: 0 }] }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Empty array → 400', async () => {
    const { status } = await api('POST', `/meal/${S.mealId}/ingredients`,
      { ingredients: [] }, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });
}

// =============================================================
// 9. MEAL DISTRIBUTION
// =============================================================
async function testDistribution() {
  section('MEAL DISTRIBUTION');

  await test('GET distribution before compute → 404', async () => {
    const { status } = await api('GET', `/meal/${S.mealId}/distribution`, null, S.schoolToken);
    assert(status === 404, `Expected 404 got ${status}`);
  });

  if (!S.ingredientId) {
    await skipTest('POST distribute', 'run importIFCTjson.js first');
    await skipTest('All 4 groups present', 'run importIFCTjson.js first');
    await skipTest('G4 > G1 per student (weight logic)', 'run importIFCTjson.js first');
    await skipTest('Student counts G1=5 G2=6 G3=7 G4=4', 'run importIFCTjson.js first');
    await skipTest('GET distribution after compute', 'run importIFCTjson.js first');
    await skipTest('Idempotent re-run', 'run importIFCTjson.js first');
  } else {
    await test('POST /api/meal/:id/distribute', async () => {
      const { status, data } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
      assert(data.distribution?.length === 4, `Expected 4 groups got ${data.distribution?.length}`);
    });

    await test('All 4 groups present (G1–G4)', async () => {
      const { data } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      const labels = data.distribution?.map(d => d.group_label).sort();
      assert(JSON.stringify(labels) === JSON.stringify(['G1','G2','G3','G4']), `Groups: ${labels}`);
    });

    await test('G4 gets more per student than G1 (weight 1.2 vs 0.8)', async () => {
      const { data } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      const g1 = data.distribution?.find(d => d.group_label === 'G1');
      const g4 = data.distribution?.find(d => d.group_label === 'G4');
      // Both groups now have students so calories_per_student > 0
      assert(parseFloat(g4.calories_per_student) > 0, `G4 calories must be > 0`);
      assert(parseFloat(g4.calories_per_student) > parseFloat(g1.calories_per_student),
        `G4 (${g4.calories_per_student}) should > G1 (${g1.calories_per_student})`);
    });

    await test('Student counts: G1=5 G2=6 G3=7 G4=4', async () => {
      const { data } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      const c = {};
      data.distribution?.forEach(d => c[d.group_label] = parseInt(d.student_count));
      assert(c.G1 === 5, `G1: expected 5 got ${c.G1}`);
      assert(c.G2 === 6, `G2: expected 6 got ${c.G2}`);
      assert(c.G3 === 7, `G3: expected 7 got ${c.G3}`);
      assert(c.G4 === 4, `G4: expected 4 got ${c.G4}`);
    });

    await test('GET distribution after compute → 200', async () => {
      const { status, data } = await api('GET', `/meal/${S.mealId}/distribution`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      assert(data.distribution?.length === 4, 'Should have 4 rows');
    });

    await test('Distribution idempotent (same result on re-run)', async () => {
      const { data: r1 } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      const { data: r2 } = await api('POST', `/meal/${S.mealId}/distribute`, null, S.schoolToken);
      const v1 = r1.distribution?.find(d => d.group_label === 'G3')?.calories_per_student;
      const v2 = r2.distribution?.find(d => d.group_label === 'G3')?.calories_per_student;
      assert(parseFloat(v1) === parseFloat(v2), `Not idempotent: ${v1} vs ${v2}`);
    });
  }

  await test('Distribute empty meal → 400', async () => {
    const { data: m } = await api('POST', '/meal/create',
      { name: 'Empty', meal_type: 'snack', served_date: '2025-06-03' }, S.schoolToken);
    const emptyId = m.meal?.id;
    const { status } = await api('POST', `/meal/${emptyId}/distribute`, null, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
    await api('DELETE', `/meal/${emptyId}`, null, S.schoolToken);
  });
}

// =============================================================
// 10. RDA REFERENCE
// =============================================================
async function testRDA() {
  section('RDA REFERENCE (ICMR-NIN 2020)');

  await test('GET /api/nutrition/rda — 12 rows loaded', async () => {
    const { status, data } = await api('GET', '/nutrition/rda', null, S.schoolToken);
    assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data.rda_reference), 'Must be array');
    if (data.rda_reference.length === 0) {
      throw new Error(
        'rda_reference is empty. Run: node scripts/migrateRDA.js  then restart server'
      );
    }
    assert(data.rda_reference.length >= 12,
      `Expected ≥12 rows, got ${data.rda_reference.length}`);
    console.log(`     ${data.rda_reference.length} RDA rows loaded ✓`);
  });

  await test('9-12 female iron (27mg) > male iron (13mg)', async () => {
    const { data } = await api('GET', '/nutrition/rda', null, S.schoolToken);
    const male   = data.rda_reference?.find(r => r.age_group === '9-12' && r.gender === 'male');
    const female = data.rda_reference?.find(r => r.age_group === '9-12' && r.gender === 'female');
    assert(male,   'Missing 9-12 male — run migrateRDA.js then restart server');
    assert(female, 'Missing 9-12 female — run migrateRDA.js then restart server');
    assert(parseFloat(female.iron_mg) > parseFloat(male.iron_mg),
      `Female iron (${female.iron_mg}) should > male iron (${male.iron_mg})`);
  });

  await test('9-12 calcium = 1200mg', async () => {
    const { data } = await api('GET', '/nutrition/rda', null, S.schoolToken);
    const row = data.rda_reference?.find(r => r.age_group === '9-12' && r.gender === 'male');
    assert(row, 'Missing 9-12 male row');
    assert(parseFloat(row.calcium_mg) === 1200, `Expected 1200 got ${row.calcium_mg}`);
  });
}

// =============================================================
// 11. NUTRITION REPORTS
// =============================================================
async function testNutritionReports() {
  section('NUTRITION REPORTS (RDA COMPARISON)');

  if (!S.ingredientId) {
    const r = 'run importIFCTjson.js first';
    await skipTest('Generate report', r);
    await skipTest('Nutrient breakdown has 7 nutrients', r);
    await skipTest('Each nutrient has received/rda/gap/status', r);
    await skipTest('RDA scales to meal fraction (lunch=40%)', r);
    await skipTest('GET saved report', r);
    await skipTest('Generate class report', r);
    await skipTest('GET class reports', r);
    await skipTest('GET student history', r);
    await skipTest('School-wide — no filters', r);
    await skipTest('School-wide filter: status=deficient', r);
    await skipTest('School-wide filter: status=deficient&nutrient=iron', r);
    await skipTest('School-wide filter: date', r);
  } else {
    await test('Generate report  POST /api/nutrition/report/:sid/:mid', async () => {
      const { status, data } = await api('POST',
        `/nutrition/report/${S.studentIds[0]}/${S.mealId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
      assert(data.report?.nutrient_breakdown, 'nutrient_breakdown must exist');
      console.log(`     ${data.report?.age_group} ${data.report?.gender} | group: ${data.report?.group_label} | status: ${data.report?.overall_status} | bmi_flag: ${data.report?.bmi_flag}`);
    });

    await test('Nutrient breakdown has 7 entries', async () => {
      const { data } = await api('POST',
        `/nutrition/report/${S.studentIds[0]}/${S.mealId}`, null, S.schoolToken);
      assert(data.report?.nutrient_breakdown?.length === 7,
        `Expected 7 got ${data.report?.nutrient_breakdown?.length}`);
    });

    await test('Each nutrient has received, rda, gap, status', async () => {
      const { data } = await api('POST',
        `/nutrition/report/${S.studentIds[0]}/${S.mealId}`, null, S.schoolToken);
      for (const nb of data.report?.nutrient_breakdown || []) {
        assert('received' in nb && 'rda' in nb && 'gap' in nb && 'status' in nb,
          `${nb.nutrient} missing a field`);
        assert(['adequate','deficient','excess'].includes(nb.status),
          `${nb.nutrient} bad status: ${nb.status}`);
      }
    });

    await test('RDA scales to lunch fraction (40% of daily)', async () => {
      const { data: rep } = await api('POST',
        `/nutrition/report/${S.studentIds[0]}/${S.mealId}`, null, S.schoolToken);
      const { data: rdaData } = await api('GET', '/nutrition/rda', null, S.schoolToken);
      const fullDay = rdaData.rda_reference?.find(
        r => r.age_group === rep.report?.age_group && r.gender === 'male');
      const expected = parseFloat(fullDay?.calories_kcal) * 0.40;
      const actual   = rep.report?.nutrient_breakdown?.find(n => n.nutrient === 'calories')?.rda;
      assert(!isNaN(expected) && Math.abs(parseFloat(actual) - expected) < 1,
        `Expected ${expected?.toFixed(2)} got ${actual}`);
    });

    await test('GET saved report  GET /api/nutrition/report/:sid/:mid', async () => {
      const { status, data } = await api('GET',
        `/nutrition/report/${S.studentIds[0]}/${S.mealId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      assert(data.report?.nutrient_breakdown?.length === 7, 'Must have 7 nutrients');
    });

    await test('Generate class report  POST /api/nutrition/report/class/:cid/:mid', async () => {
      const { status, data } = await api('POST',
        `/nutrition/report/class/${S.classIds[2]}/${S.mealId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}: ${JSON.stringify(data)}`);
      assert(data.reports?.length >= 1, `Must have reports. Got: ${JSON.stringify(data)}`);
      console.log(`     Generated ${data.reports?.length} reports for class`);
    });

    await test('GET class reports  GET /api/nutrition/reports/class/:cid/:mid', async () => {
      const { status, data } = await api('GET',
        `/nutrition/reports/class/${S.classIds[2]}/${S.mealId}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      assert(data.reports?.length >= 1, 'Must have saved reports');
    });

    await test('GET student history  GET /api/nutrition/reports/student/:sid', async () => {
      const { status, data } = await api('GET',
        `/nutrition/reports/student/${S.studentIds[0]}`, null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      assert(data.reports?.length >= 1, 'Must have history');
    });

    await test('School-wide — no filters', async () => {
      const { status, data } = await api('GET', '/nutrition/reports/school', null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      console.log(`     Total reports: ${data.count}`);
    });

    await test('School-wide filter: ?status=deficient', async () => {
      const { status, data } = await api('GET',
        '/nutrition/reports/school?status=deficient', null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      console.log(`     Deficient: ${data.count}`);
    });

    await test('School-wide filter: ?status=deficient&nutrient=iron', async () => {
      const { status, data } = await api('GET',
        '/nutrition/reports/school?status=deficient&nutrient=iron', null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
      console.log(`     Iron deficient: ${data.count}`);
    });

    await test('School-wide filter: ?date=2025-06-02', async () => {
      const { status } = await api('GET',
        '/nutrition/reports/school?date=2025-06-02', null, S.schoolToken);
      assert(status === 200, `Expected 200 got ${status}`);
    });
  }

  await test('Invalid nutrient → 400', async () => {
    const { status } = await api('GET',
      '/nutrition/reports/school?status=deficient&nutrient=sugar', null, S.schoolToken);
    assert(status === 400, `Expected 400 got ${status}`);
  });

  await test('Report for non-existent student → 404', async () => {
    const { status } = await api('POST',
      `/nutrition/report/99999/${S.mealId || 1}`, null, S.schoolToken);
    assert(status === 404, `Expected 404 got ${status}`);
  });
}

// =============================================================
// 12. SECURITY
// =============================================================
async function testSecurity() {
  section('SECURITY & PERMISSIONS');

  await test('Teacher WITHOUT meal permission cannot create meal → 403', async () => {
    const e = `noperm_${Date.now()}@test.com`;
    await api('POST', '/teacher/create',
      { name: 'NoPerm', email: e, password: 'pass123' }, S.schoolToken);
    const { data: ld } = await api('POST', '/teacher/login', { email: e, password: 'pass123' });
    const { status } = await api('POST', '/meal/create',
      { name: 'Blocked', meal_type: 'lunch', served_date: '2025-06-01' }, ld.token);
    assert(status === 403, `Expected 403 got ${status}`);
  });

  await test('Revoke permission → teacher immediately blocked → 403', async () => {
    await api('PATCH', `/teacher/${S.teacherId}/meal-permission`,
      { can_manage_meals: false }, S.schoolToken);
    const { status } = await api('POST', '/meal/create',
      { name: 'Blocked', meal_type: 'lunch', served_date: '2025-06-01' }, S.teacherToken);
    assert(status === 403, `Expected 403 got ${status}`);
    // Restore
    await api('PATCH', `/teacher/${S.teacherId}/meal-permission`,
      { can_manage_meals: true }, S.schoolToken);
  });

  await test('Teacher cannot delete meal → 403', async () => {
    const { status } = await api('DELETE', `/meal/${S.mealId}`, null, S.teacherToken);
    assert(status === 403, `Expected 403 got ${status}`);
  });

  await test('Teacher cannot assign class groups → 403', async () => {
    const { status } = await api('POST', '/class-group/assign',
      { class_id: S.classIds[0], group_label: 'G1' }, S.teacherToken);
    assert(status === 403, `Expected 403 got ${status}`);
  });

  await test('No token on protected route → 401', async () => {
    const { status } = await api('GET', '/student/');
    assert(status === 401, `Expected 401 got ${status}`);
  });
}

// =============================================================
// MAIN
// =============================================================
async function main() {
  console.log(B('\n╔════════════════════════════════════════════╗'));
  console.log(B('║   Mind-Meals Complete Backend Test Suite   ║'));
  console.log(B('╚════════════════════════════════════════════╝'));
  console.log(Y('\nFirst-time setup order:'));
  console.log(Y('  1. node scripts/migrateIngredients.js'));
  console.log(Y('  2. node scripts/migrateRDA.js'));
  console.log(Y('  3. node index.js'));
  console.log(Y('  4. node scripts/importIFCTjson.js'));
  console.log(Y('  5. node test-all-apis.js\n'));

  const ping = await api('GET', '/../');
  if (ping.status === 0) {
    console.log(R('\n❌ Cannot reach http://localhost:5000 — start server first\n'));
    process.exit(1);
  }

  await testSchoolAuth();
  await testTeacher();
  await testClasses();
  await testStudents();
  await testHealth();
  await testIngredients();
  await testMeals();
  await testMealIngredients();
  await testDistribution();
  await testRDA();
  await testNutritionReports();
  await testSecurity();

  const total = passed + failed + skipped;
  console.log('\n' + B('─'.repeat(50)));
  console.log(B(`Results: ${total} tests`));
  console.log(G(`  ✔ Passed:  ${passed}`));
  if (failed > 0) console.log(R(`  ✘ Failed:  ${failed}`));
  else            console.log(G(`  ✘ Failed:  0`));
  if (skipped > 0) console.log(Y(`  ⊘ Skipped: ${skipped}  ← run importIFCTjson.js to unlock`));
  console.log(B('─'.repeat(50) + '\n'));
  if (failed > 0) process.exit(1);
}

main();