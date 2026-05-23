import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  addMealIngredients,
  createMeal,
  deleteMeal,
  updateMeal,
  getIngredients,
  getMeals,
} from '../api/meals';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState, Spinner } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { Eye, Leaf, Lock, Pencil, Plus, Search, Trash2, UtensilsCrossed, X, Zap, FlaskConical } from 'lucide-react';

const DEFAULT_FOODS = [
  'rice raw milled',
  'wheat flour atta',
  'jowar',
  'bajra',
  'ragi',
  'toor dal',
  'moong dal',
  'chana dal',
  'milk whole cow',
  'curd',
  'egg poultry whole raw',
  'potato',
  'onion',
  'banana',
  'peanut',
];

function NutrientReferenceTable() {
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);

  const loadFoods = async (searchTerm = '') => {
    setLoading(true);

    try {
      const res = await getIngredients({
        search: searchTerm,
        limit: 50,
      });

      setFoods(res.data.ingredients || res.data || []);
    } catch {
      setFoods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultFoods = async () => {
    setLoading(true);

    try {
      const responses = await Promise.all(
        DEFAULT_FOODS.map((food) =>
          getIngredients({
            search: food,
            limit: 1,
          }),
        ),
      );

      const items = responses
        .map((res) => {
          const data = res.data.ingredients || res.data || [];
          return data[0];
        })
        .filter(Boolean);

      setFoods(items);
    } catch {
      setFoods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefaultFoods();
  }, []);

  const handleSearch = (event) => {
    const value = event.target.value;

    setSearch(value);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!value.trim()) {
        loadDefaultFoods();
        return;
      }

      loadFoods(value);
    }, 400);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
          <FlaskConical size={14} className="text-[var(--accent)]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Nutrient Reference
          </div>

          <div className="text-[10px] text-[var(--text-muted)]">
            Per 100g
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[var(--border)]">
        <Input
          placeholder="Search food..."
          value={search}
          onChange={handleSearch}
          icon={Search}
        />
      </div>

      {/* Table header */}
      <div className="
        grid
        grid-cols-[2fr_repeat(6,minmax(55px,1fr))]
        gap-0
        px-3
        py-2
        bg-[var(--bg-hover)]
        border-b
        border-[var(--border)]
      ">
        {['Food', 'kcal', 'Pro', 'Carb', 'Fat', 'Fe', 'Ca'].map((h, i) => (
          <div
            key={h}
            className={`
              text-[10px]
              font-semibold
              uppercase
              tracking-wide
              text-[var(--text-muted)]
              ${i === 0 ? '' : 'text-right'}
            `}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size={18} />
          </div>
        ) : foods.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] text-center py-8">
            No foods found
          </div>
        ) : (
          foods.map((food, i) => (
            <div
              key={food.id}
              className={`
                grid
                grid-cols-[2fr_repeat(6,minmax(55px,1fr))]
                gap-0
                px-3
                py-2
                transition-colors
                hover:bg-[var(--accent-dim)]
                ${i % 2 === 0 ? '' : 'bg-[var(--bg-hover)]'}
              `}
            >
              {/* Food */}
              <div className="truncate pr-2">
                <div className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                  {ingredientName(food)}
                </div>

                {ingredientCategory(food) && (
                  <div className="text-[9px] text-[var(--text-muted)] truncate">
                    {ingredientCategory(food)}
                  </div>
                )}
              </div>

              {/* kcal */}
              <div className="text-[11px] text-right mono text-[var(--amber)]">
                {food.calories_per_100g ?? '-'}
              </div>

              {/* protein */}
              <div className="text-[11px] text-right mono text-[var(--blue)]">
                {food.protein_per_100g ?? '-'}
              </div>

              {/* carbs */}
              <div className="text-[11px] text-right mono text-[var(--text-secondary)]">
                {food.carbs_per_100g ?? '-'}
              </div>

              {/* fat */}
              <div className="text-[11px] text-right mono text-[var(--text-muted)]">
                {food.fat_per_100g ?? '-'}
              </div>

              {/* iron */}
              <div className="text-[11px] text-right mono text-[var(--text-muted)]">
                {food.iron_mg_per_100g ?? '-'}
              </div>

              {/* calcium */}
              <div className="text-[11px] text-right mono text-[var(--text-muted)]">
                {food.calcium_mg_per_100g ?? '-'}
              </div>
            </div>
          ))
        )}

      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-[var(--border)] flex flex-wrap gap-x-3 gap-y-1">
        {[
          ['kcal', 'Calories'],
          ['Pro', 'Protein (g)'],
          ['Carb', 'Carbs (g)'],
          ['Fat', 'Fat (g)'],
          ['Fe', 'Iron (mg)'],
          ['Ca', 'Calcium (mg)'],
        ].map(([short, full]) => (
          <span
            key={short}
            className="text-[9px] text-[var(--text-muted)]"
          >
            <span className="font-semibold">{short}</span> = {full}
          </span>
        ))}
      </div>

    </div>
  );
}

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
};

const todayKey = () => getISTDate();

const normalizeDate = (date) => {
  if (!date) return '';

  const parsed = new Date(date);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const [year, month, day] = String(dateString)
    .split('T')[0]
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
};


const isToday = (date) => normalizeDate(date) === todayKey();

const ingredientName = (ing) =>
  ing?.display_name || ing?.name || ing?.ingredient_name || `Ingredient ${ing?.id || ing?.ingredient_id}`;

const ingredientCategory = (ing) => ing?.category || ing?.food_group;

const PREVIEW_NUTRIENTS = [
  ['calories_per_100g', 'kcal'],
  ['protein_per_100g', 'protein'],
  ['carbs_per_100g', 'carbs'],
  ['fat_per_100g', 'fat'],
  ['iron_mg_per_100g', 'iron'],
  ['calcium_mg_per_100g', 'calcium'],
];

function NutrientPreview({ ingredient }) {
  const items = PREVIEW_NUTRIENTS
    .map(([key, label]) => [label, ingredient?.[key]])
    .filter(([, value]) => value !== null && value !== undefined);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {items.map(([label, value]) => (
        <span
          key={label}
          className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-soft)] rounded px-1.5 py-0.5"
        >
          {label}: <span className="mono text-[var(--text-secondary)]">{Number(value).toFixed(value >= 10 ? 0 : 1)}</span>
        </span>
      ))}
    </div>
  );
}

function StepInfo({ form, setForm, errors }) {
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-[var(--text-muted)] mb-1">Step 1 of 2 - Meal Details</div>
      <Input
        label="Meal Name"
        placeholder="e.g. Dal Rice Plate"
        value={form.name}
        onChange={set('name')}
        error={errors.name}
      />
      <Input
        label="Served Date"
        type="date"
        value={form.served_date}
        onChange={set('served_date')}
        error={errors.served_date}
      />
    </div>
  );
}

function StepIngredients({ ingredients, setIngredients }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState({});
  const debounceRef = useRef(null);

  const search = async (term) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await getIngredients({ search: term, limit: 10 });
      setResults(res.data.ingredients || res.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleQuery = (event) => {
    const value = event.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const addIngredient = async (ingredient) => {
    const grams = parseFloat(qty[ingredient.id] || 100);
    if (!grams || grams <= 0) return;


    setIngredients((current) => {
      const existing = current.find((item) => item.ingredient_id === ingredient.id);
      const next = {
        ...ingredient,
        ingredient_id: ingredient.id,
        quantity_g: grams,
        display_name: ingredientName(ingredient),
      };

      if (existing) {
        return current.map((item) => (item.ingredient_id === ingredient.id ? { ...item, ...next } : item));
      }

      return [...current, next];
    });

    setResults([]);
    setQuery('');
  };

  const removeIngredient = (id) => {
    setIngredients((current) => current.filter((item) => item.ingredient_id !== id));
  };

  const updateQty = (id, value) => {
    setIngredients((current) =>
      current.map((item) => (item.ingredient_id === id ? { ...item, quantity_g: parseFloat(value) || 0 } : item)),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-[var(--text-muted)] mb-1">Step 2 of 2 - Add Ingredients</div>

      <div className="relative">
        <Input
          label="Search Ingredient"
          placeholder="e.g. rice, dal, milk..."
          value={query}
          onChange={handleQuery}
          icon={Search}
        />
        {searching && (
          <div className="absolute right-3 top-9">
            <Spinner size={14} />
          </div>
        )}
        {results.length > 0 && (
          <div className="absolute z-10 w-full top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-xl overflow-hidden">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer"
                onClick={() => addIngredient(result)}
              >
                <div className="min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{ingredientName(result)}</div>
                  {ingredientCategory(result) && (
                    <div className="text-xs text-[var(--text-muted)]">{ingredientCategory(result)}</div>
                  )}
                  <NutrientPreview ingredient={result} />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    placeholder="g"
                    className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                    value={qty[result.id] || ''}
                    onChange={(event) => setQty((current) => ({ ...current, [result.id]: event.target.value }))}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span className="text-xs text-[var(--text-muted)]">g</span>
                  <button
                    className="text-xs bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)] rounded px-2 py-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      addIngredient(result);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ingredients.length > 0 ? (
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} selected
          </div>
          {ingredients.map((ingredient) => (
            <div
              key={ingredient.ingredient_id}
              className="flex items-center gap-3 bg-[var(--bg-hover)] rounded-[var(--radius)] px-3 py-2"
            >
              <Leaf size={13} className="text-[var(--accent)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[var(--text-primary)] truncate block">{ingredientName(ingredient)}</span>
                <NutrientPreview ingredient={ingredient} />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none mono"
                  value={ingredient.quantity_g}
                  onChange={(event) => updateQty(ingredient.ingredient_id, event.target.value)}
                  min="1"
                />
                <span className="text-xs text-[var(--text-muted)]">g</span>
              </div>
              <button
                onClick={() => removeIngredient(ingredient.ingredient_id)}
                className="text-[var(--text-muted)] hover:text-[var(--red)]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-muted)] text-center py-4 border border-dashed border-[var(--border)] rounded-[var(--radius)]">
          Search and add ingredients above
        </div>
      )}
    </div>
  );
}

export default function MealsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [createdMealId, setCreatedMealId] = useState(null);
  const [form, setForm] = useState({ name: '', served_date: todayKey() });
  const [ingredients, setIngredients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const canManageMeals = user?.role === 'school' || user?.can_manage_meals;

  const load = async () => {
    try {
      const res = await getMeals();
      setMeals(res.data.meals || []);
    } catch {
      toast('Failed to load meals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getMeals()
      .then((res) => {
        if (active) setMeals(res.data.meals || []);
      })
      .catch(() => {
        if (active) toast('Failed to load meals', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [toast]);

  const validateStep1 = () => {
    const nextErrors = {};
    if (!form.name) nextErrors.name = 'Required';
    if (!form.served_date) nextErrors.served_date = 'Required';
    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  };

  const handleStep1 = async () => {
    if (!validateStep1()) return;

    setSubmitting(true);
    try {
      const res = await createMeal(form);
      setCreatedMealId(res.data.meal.id);
      setStep(2);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create meal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2 = async () => {
    if (ingredients.length === 0) {
      toast('Add at least one ingredient', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await addMealIngredients(
        createdMealId,
        ingredients.map(({ ingredient_id, quantity_g }) => ({ ingredient_id, quantity_g })),
      );
      toast('Meal created with ingredients', 'success');
      setShowModal(false);
      resetModal();
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add ingredients', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setCreatedMealId(null);
    setForm({ name: '', served_date: todayKey() });
    setIngredients([]);
    setErrors({});
  };

  const [editMeal, setEditMeal] = useState(null); // { id, name, served_date }
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleEditOpen = (meal) => {
    setEditMeal({ id: meal.id, name: meal.name, served_date: normalizeDate(meal.served_date) });
  };

  const handleEditSave = async () => {
    if (!editMeal?.name?.trim()) {
      toast('Meal name is required', 'warning');
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await updateMeal(editMeal.id, { name: editMeal.name });
      toast('Meal updated', 'success');
      setMeals((current) =>
        current.map((m) => (m.id === editMeal.id ? { ...m, name: res.data.meal?.name || editMeal.name } : m))
      );
      setEditMeal(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update meal', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (meal) => {
    if (!confirm('Delete this meal?')) return;

    try {
      await deleteMeal(meal.id);
      toast('Meal deleted', 'success');
      setMeals((current) => current.filter((item) => item.id !== meal.id));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete meal', 'error');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Meals"
        description={`${meals.length} meal${meals.length !== 1 ? 's' : ''} logged`}
        action={
          canManageMeals && (
            <Button icon={Plus} onClick={() => { resetModal(); setShowModal(true); }}>
              Create Meal
            </Button>
          )
        }
      />

      <div className="flex gap-5 items-start">
        {/* ── Left: meals list ── */}
        <div className="flex-1 min-w-0">
          {meals.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No meals yet"
              description={canManageMeals ? 'Create your first meal to start tracking nutrition' : 'No meals have been logged yet'}
              action={
                canManageMeals && (
                  <Button icon={Plus} onClick={() => { resetModal(); setShowModal(true); }}>
                    Create Meal
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-3">
              {meals.map((meal) => {
                const locked = !isToday(meal.served_date);


                return (
                  <Card key={meal.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed size={18} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{meal.name}</span>
                        {locked && (
                          <Badge color="muted" className="gap-1">
                            <Lock size={10} /> Locked
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {parseLocalDate(meal.served_date)?.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/meals/${meal.id}`}>
                        <Button variant="secondary" size="sm" icon={Eye}>
                          View
                        </Button>
                      </Link>
                      {canManageMeals && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Zap}
                            onClick={() => navigate(`/nutrition?meal_id=${meal.id}`)}
                          >
                            Analyze
                          </Button>
                          {!locked && (
                            <>
                              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => handleEditOpen(meal)} />
                              <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(meal)} />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>{/* end left col */}

        {/* ── Right: nutrient reference table ── */}
        <div className="w-120 flex-shrink-0 sticky top-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <NutrientReferenceTable />
        </div>
      </div>{/* end two-col */}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetModal(); }}
        title={step === 1 ? 'Create Meal' : 'Add Ingredients'}
        size="md"
      >
        {step === 1 ? (
          <>
            <StepInfo form={form} setForm={setForm} errors={errors} />
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">
                Cancel
              </Button>
              <Button className="flex-1" loading={submitting} onClick={handleStep1}>
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <StepIngredients ingredients={ingredients} setIngredients={setIngredients} />
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)} type="button">
                Back
              </Button>
              <Button className="flex-1" loading={submitting} onClick={handleStep2}>
                Submit Meal
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={!!editMeal}
        onClose={() => setEditMeal(null)}
        title="Edit Meal"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Meal Name"
            value={editMeal?.name || ''}
            onChange={(e) => setEditMeal((m) => ({ ...m, name: e.target.value }))}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditMeal(null)}>Cancel</Button>
            <Button className="flex-1" loading={editSubmitting} onClick={handleEditSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}