import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMeals, createMeal, deleteMeal,
  addMealIngredients, distributeMeal,
  getMealById, getIngredients,
} from '../api/meals';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState, Spinner } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import {
  UtensilsCrossed, Plus, Trash2, Search, X,
  ChevronRight, Leaf, Send, Eye, Zap
} from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

function MealTypeColor(type) {
  const map = { breakfast: 'amber', lunch: 'green', snack: 'blue', dinner: 'purple' };
  return map[type] || 'muted';
}

// Step 1: Basic meal info
function StepInfo({ form, setForm, errors }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-[var(--text-muted)] mb-1">Step 1 of 2 — Meal Details</div>
      <Input label="Meal Name" placeholder="e.g. Dal Rice Plate" value={form.name} onChange={set('name')} error={errors.name} />
      <Select label="Meal Type" value={form.meal_type} onChange={set('meal_type')} error={errors.meal_type}>
        <option value="">Select type...</option>
        {MEAL_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
      </Select>
      <Input label="Served Date" type="date" value={form.served_date} onChange={set('served_date')} error={errors.served_date} />
    </div>
  );
}

// Step 2: Ingredient picker
function StepIngredients({ ingredients, setIngredients }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState({});
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await getIngredients({ search: q, limit: 10 });
      setResults(res.data.ingredients || res.data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleQuery = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const addIngredient = (ing) => {
    const g = parseFloat(qty[ing.id] || 100);
    if (!g || g <= 0) return;
    // Avoid duplicate
    setIngredients((prev) => {
      const exists = prev.find((i) => i.ingredient_id === ing.id);
      if (exists) return prev.map((i) => i.ingredient_id === ing.id ? { ...i, quantity_g: g } : i);
      return [...prev, { ingredient_id: ing.id, quantity_g: g, name: ing.name }];
    });
    setResults([]);
    setQuery('');
  };

  const removeIngredient = (id) => setIngredients((prev) => prev.filter((i) => i.ingredient_id !== id));

  const updateQty = (id, val) => setIngredients((prev) =>
    prev.map((i) => i.ingredient_id === id ? { ...i, quantity_g: parseFloat(val) || 0 } : i)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-[var(--text-muted)] mb-1">Step 2 of 2 — Add Ingredients</div>

      {/* Search */}
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
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer"
                onClick={() => addIngredient(r)}
              >
                <div>
                  <div className="text-sm text-[var(--text-primary)]">{r.name}</div>
                  {r.food_group && <div className="text-xs text-[var(--text-muted)]">{r.food_group}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="g"
                    className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                    value={qty[r.id] || ''}
                    onChange={(e) => setQty((q) => ({ ...q, [r.id]: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-[var(--text-muted)]">g</span>
                  <button
                    className="text-xs bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)] rounded px-2 py-1"
                    onClick={(e) => { e.stopPropagation(); addIngredient(r); }}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected ingredients */}
      {ingredients.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} selected
          </div>
          {ingredients.map((ing) => (
            <div key={ing.ingredient_id} className="flex items-center gap-3 bg-[var(--bg-hover)] rounded-[var(--radius)] px-3 py-2">
              <Leaf size={13} className="text-[var(--accent)] flex-shrink-0" />
              <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{ing.name}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none mono"
                  value={ing.quantity_g}
                  onChange={(e) => updateQty(ing.ingredient_id, e.target.value)}
                  min="1"
                />
                <span className="text-xs text-[var(--text-muted)]">g</span>
              </div>
              <button onClick={() => removeIngredient(ing.ingredient_id)} className="text-[var(--text-muted)] hover:text-[var(--red)]">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {ingredients.length === 0 && (
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
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [createdMealId, setCreatedMealId] = useState(null);
  const [form, setForm] = useState({ name: '', meal_type: '', served_date: new Date().toISOString().split('T')[0] });
  const [ingredients, setIngredients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const canManageMeals = user?.role === 'school' || user?.can_manage_meals;

  const load = async () => {
    try {
      const res = await getMeals();
      setMeals(res.data.meals || []);
    } catch { toast('Failed to load meals', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const validateStep1 = () => {
    const e = {};
    if (!form.name) e.name = 'Required';
    if (!form.meal_type) e.meal_type = 'Required';
    if (!form.served_date) e.served_date = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
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
    } finally { setSubmitting(false); }
  };

  const handleStep2 = async () => {
    if (ingredients.length === 0) { toast('Add at least one ingredient', 'warning'); return; }
    setSubmitting(true);
    try {
      await addMealIngredients(createdMealId, ingredients.map(({ ingredient_id, quantity_g }) => ({ ingredient_id, quantity_g })));
      toast('Meal created with ingredients!', 'success');
      setShowModal(false);
      resetModal();
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add ingredients', 'error');
    } finally { setSubmitting(false); }
  };

  const resetModal = () => {
    setStep(1);
    setCreatedMealId(null);
    setForm({ name: '', meal_type: '', served_date: new Date().toISOString().split('T')[0] });
    setIngredients([]);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this meal?')) return;
    try {
      await deleteMeal(id);
      toast('Meal deleted', 'success');
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch { toast('Failed', 'error'); }
  };

  const handleDistribute = async (id) => {
    try {
      await distributeMeal(id);
      toast('Meal distribution computed!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Distribution failed', 'error');
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
            <Button icon={Plus} onClick={() => { resetModal(); setShowModal(true); }}>Create Meal</Button>
          )
        }
      />

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meals yet"
          description={canManageMeals ? "Create your first meal to start tracking nutrition" : "No meals have been logged yet"}
          action={canManageMeals && <Button icon={Plus} onClick={() => { resetModal(); setShowModal(true); }}>Create Meal</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {meals.map((m) => (
            <Card key={m.id} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={18} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{m.name}</span>
                  <Badge color={MealTypeColor(m.meal_type)}>{m.meal_type}</Badge>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {new Date(m.served_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/meals/${m.id}`}>
                  <Button variant="secondary" size="sm" icon={Eye}>View</Button>
                </Link>
                {canManageMeals && (
                  <>
                    <Button variant="secondary" size="sm" icon={Send} onClick={() => handleDistribute(m.id)}>Distribute</Button>
                    <Button
                      variant="secondary" size="sm" icon={Zap}
                      onClick={() => navigate(`/nutrition?meal_id=${m.id}`)}
                    >Analyze</Button>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(m.id)} />
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create meal modal */}
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
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancel</Button>
              <Button className="flex-1" loading={submitting} onClick={handleStep1}>Next →</Button>
            </div>
          </>
        ) : (
          <>
            <StepIngredients ingredients={ingredients} setIngredients={setIngredients} />
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)} type="button">← Back</Button>
              <Button className="flex-1" loading={submitting} onClick={handleStep2}>
                Submit Meal
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
