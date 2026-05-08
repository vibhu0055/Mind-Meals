import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMealById, getMealDistribution, getMealSummary, addMealIngredients, getIngredients, getIngredientNutrition } from '../api/meals';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { PageLoader, EmptyState, Spinner } from '../components/ui/Spinner';
import {
  AdequacyProgressBars,
  NutrientComparisonChart,
  PmPoshanComparisonChart,
  ScoreRing,
} from '../components/ui/Charts';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Leaf,
  Lightbulb,
  Lock,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const normalizeDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isToday = (date) => normalizeDate(date) === todayKey();

const NUTRIENT_META = {
  calories: { label: 'Calories', shortLabel: 'CAL', unit: 'kcal' },
  protein: { label: 'Protein', shortLabel: 'PRO', unit: 'g' },
  carbs: { label: 'Carbs', shortLabel: 'CAR', unit: 'g' },
  fat: { label: 'Fat', shortLabel: 'FAT', unit: 'g' },
  fiber: { label: 'Fiber', shortLabel: 'FIB', unit: 'g' },
  iron: { label: 'Iron', shortLabel: 'IRON', unit: 'mg' },
  calcium: { label: 'Calcium', shortLabel: 'CALC', unit: 'mg' },
};

const INSIGHT_KEYS = ['calories', 'protein', 'iron', 'calcium', 'fiber'];

const ingredientName = (ingredient) =>
  ingredient?.display_name || ingredient?.ingredient_name || ingredient?.name || `Ingredient ${ingredient?.ingredient_id || ingredient?.id}`;

const per100 = [
  ['calories_per_100g', 'kcal'],
  ['protein_per_100g', 'protein'],
  ['carbs_per_100g', 'carbs'],
  ['fat_per_100g', 'fat'],
  ['iron_mg_per_100g', 'iron'],
  ['calcium_mg_per_100g', 'calcium'],
];

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(Number(value) >= 100 ? 0 : digits);
}

function adequacyColor(pct) {
  if (pct >= 100) return 'var(--accent)';
  if (pct >= 75) return 'var(--blue)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--red)';
}

function scoreBadgeColor(label) {
  const normalized = String(label || '').toLowerCase();
  if (normalized === 'balanced') return 'green';
  if (normalized === 'good') return 'blue';
  if (normalized === 'average') return 'amber';
  return 'red';
}

function pmStatusColor(status) {
  if (status === 'meeting_standard') return 'green';
  if (status === 'partial') return 'amber';
  return 'red';
}

function normaliseSummary(data) {
  return data?.summary || data || null;
}

function breakdownArray(summary) {
  const breakdown = summary?.nutrient_breakdown || {};
  return Object.entries(breakdown).map(([key, value]) => ({
    nutrient: key,
    label: NUTRIENT_META[key]?.label || key,
    shortLabel: NUTRIENT_META[key]?.shortLabel || key.slice(0, 3).toUpperCase(),
    unit: NUTRIENT_META[key]?.unit || 'g',
    provided: Number(value?.provided) || 0,
    rda: Number(value?.rda) || 0,
    adequacy: Number(value?.adequacy) || 0,
  }));
}

function NutrientInsightCards({ nutrients }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {nutrients.map((nutrient) => (
        <Card key={nutrient.nutrient} className="p-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">{nutrient.label}</div>
          <div className="text-xl font-bold text-[var(--text-primary)] mono">
            {formatNumber(nutrient.provided)}
            <span className="text-xs text-[var(--text-muted)] ml-1">{nutrient.unit}</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            required {formatNumber(nutrient.rda)}{nutrient.unit}
          </div>
          <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden mt-3 mb-1.5">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(nutrient.adequacy, 100)}%`, backgroundColor: adequacyColor(nutrient.adequacy) }}
            />
          </div>
          <div className="text-xs font-semibold mono" style={{ color: adequacyColor(nutrient.adequacy) }}>
            {formatNumber(nutrient.adequacy, 0)}% adequate
          </div>
        </Card>
      ))}
    </div>
  );
}

function IngredientCard({ ingredient, locked, onRemove, onQtyChange }) {
  return (
    <Card className="py-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
          <Leaf size={14} className="text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{ingredientName(ingredient)}</div>
            {ingredient.category && <Badge color="muted">{ingredient.category}</Badge>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {per100.map(([key, label]) => (
              <div key={key} className="bg-[var(--bg-hover)] rounded px-2 py-1.5">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{label}</div>
                <div className="text-xs text-[var(--text-primary)] mono">{formatNumber(ingredient[key])}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {locked ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Lock size={11} /> {formatNumber(ingredient.quantity_g, 0)}g
            </div>
          ) : (
            <>
              <input
                type="number"
                min="1"
                className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] mono focus:outline-none"
                value={ingredient.quantity_g}
                onChange={(e) => onQtyChange(ingredient.ingredient_id ?? ingredient.id, e.target.value)}
              />
              <span className="text-xs text-[var(--text-muted)]">g</span>
              <button onClick={() => onRemove(ingredient.ingredient_id ?? ingredient.id)} className="text-[var(--text-muted)] hover:text-[var(--red)]">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function AddIngredientRow({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState('100');
  const debounceRef = useRef(null);

  const search = async (term) => {
    if (!term.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await getIngredients({ search: term, limit: 8 });
      setResults(res.data.ingredients || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleQuery = (e) => {
    setQuery(e.target.value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(e.target.value), 400);
  };

  const pick = async (ing) => {
    let nutrition = {};
    try { const r = await getIngredientNutrition(ing.id); nutrition = r.data || {}; } catch {}
    onAdd({ ...ing, ...nutrition, ingredient_id: ing.id, quantity_g: parseFloat(qty) || 100 });
    setQuery(''); setResults([]);
  };

  return (
    <div className="relative mt-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input placeholder="Search ingredient to add..." value={query} onChange={handleQuery} icon={Search} />
          {searching && <div className="absolute right-3 top-9"><Spinner size={14} /></div>}
          {results.length > 0 && (
            <div className="absolute z-10 w-full top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-xl overflow-hidden">
              {results.map((r) => (
                <div key={r.id} onClick={() => pick(r)} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer">
                  <div>
                    <div className="text-sm text-[var(--text-primary)]">{r.display_name}</div>
                    {r.category && <div className="text-xs text-[var(--text-muted)]">{r.category}</div>}
                  </div>
                  <Plus size={14} className="text-[var(--accent)]" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-end gap-1">
          <input type="number" min="1" placeholder="g" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-2 text-xs text-[var(--text-primary)] mono focus:outline-none" />
          <span className="text-xs text-[var(--text-muted)] pb-2">g</span>
        </div>
      </div>
    </div>
  );
}

function DistributionSection({ distribution }) {
  if (!distribution.length) {
    return (
      <EmptyState
        icon={Users}
        title="Distribution not available"
        description="Assign classes to groups and add ingredients to this meal to see per-student nutrient allocation."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {distribution.map((row) => (
        <Card key={row.group_label} className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{row.group_label}</div>
            <div className="text-xs text-[var(--text-muted)]">{row.student_count} students</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['calories_per_student', 'Calories', 'kcal'],
              ['protein_per_student', 'Protein', 'g'],
              ['iron_per_student', 'Iron', 'mg'],
              ['calcium_per_student', 'Calcium', 'mg'],
            ].map(([key, label, unit]) => (
              <div key={key} className="bg-[var(--bg-hover)] rounded px-2.5 py-2">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{label}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mono">
                  {formatNumber(row[key])}{unit}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PmPoshanSection({ pmPoshan }) {
  const rows = [
    ['primary', 'Primary'],
    ['upper_primary', 'Upper Primary'],
  ].filter(([key]) => pmPoshan?.[key]);

  if (!rows.length) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={15} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">PM POSHAN Status</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {rows.map(([key, label]) => {
          const data = pmPoshan[key];
          return (
            <div key={key} className="border border-[var(--border)] rounded-[10px] p-4 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
                <Badge color={pmStatusColor(data.status)}>{String(data.status || '').replace('_', ' ')}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Calories</div>
                  <div className="text-lg font-bold mono" style={{ color: adequacyColor(data.calorie_pct) }}>
                    {formatNumber(data.calorie_pct, 0)}%
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {formatNumber(data.provided_calories)} / {formatNumber(data.target_calories)} kcal
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Protein</div>
                  <div className="text-lg font-bold mono" style={{ color: adequacyColor(data.protein_pct) }}>
                    {formatNumber(data.protein_pct, 0)}%
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {formatNumber(data.provided_protein)} / {formatNumber(data.target_protein)} g
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PmPoshanComparisonChart pmPoshan={pmPoshan} />
    </Card>
  );
}

function SuggestionsSection({ suggestions = [] }) {
  if (!suggestions.length) return null;

  const grouped = suggestions.reduce((acc, suggestion) => {
    const key = suggestion.category || suggestion.nutrient || 'general';
    acc[key] = acc[key] || [];
    acc[key].push(suggestion);
    return acc;
  }, {});

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={15} className="text-[var(--amber)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Suggestions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="border border-[var(--border)] rounded-[10px] p-4 bg-[var(--bg-surface)]">
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{category}</div>
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <div key={`${item.nutrient}-${index}`} className="flex gap-2.5">
                  <CheckCircle2 size={14} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <div>
                    <Badge color="muted">{item.nutrient}</Badge>
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{item.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExplanationSection({ explanation }) {
  if (!explanation) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={15} className="text-[var(--blue)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nutrition Analysis</h2>
      </div>
      <div className="space-y-2">
        {String(explanation)
          .split('\n')
          .filter((line) => line.trim())
          .map((line, index) => (
            <p key={index} className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {line}
            </p>
          ))}
      </div>
    </Card>
  );
}

export default function MealDetailPage() {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMealById(id),
      getMealDistribution(id).catch(() => ({ data: { distribution: [] } })),
      getMealSummary(id).catch(() => ({ data: null })),
    ]).then(([mealRes, distributionRes, summaryRes]) => {
      const nextSummary = normaliseSummary(summaryRes.data);
      setMeal(mealRes.data.meal || summaryRes.data?.meal || null);
      setIngredients(mealRes.data.ingredients || []);
      setDistribution(distributionRes.data.distribution || []);
      setSummary(nextSummary);
    }).catch(() => {
      setMeal(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  const toast = useToast();
  const [editIngredients, setEditIngredients] = useState(null); // null = not editing
  const [savingIngredients, setSavingIngredients] = useState(false);

  const startEditing = () => setEditIngredients(
    ingredients.map((i) => ({ ...i, ingredient_id: i.ingredient_id ?? i.id }))
  );

  const handleQtyChange = (ingredient_id, value) => {
    setEditIngredients((current) =>
      current.map((i) => i.ingredient_id === ingredient_id ? { ...i, quantity_g: parseFloat(value) || 0 } : i)
    );
  };

  const handleRemove = (ingredient_id) => {
    setEditIngredients((current) => current.filter((i) => i.ingredient_id !== ingredient_id));
  };

  const handleAdd = (ingredient) => {
    setEditIngredients((current) => {
      const exists = current.find((i) => i.ingredient_id === ingredient.ingredient_id);
      if (exists) return current.map((i) => i.ingredient_id === ingredient.ingredient_id ? { ...i, quantity_g: ingredient.quantity_g } : i);
      return [...current, ingredient];
    });
  };

  const handleSaveIngredients = async () => {
    if (!editIngredients || editIngredients.length === 0) {
      toast('Add at least one ingredient', 'warning');
      return;
    }
    setSavingIngredients(true);
    try {
      await addMealIngredients(id, editIngredients.map(({ ingredient_id, quantity_g }) => ({ ingredient_id, quantity_g })));
      toast('Ingredients updated', 'success');
      // Refresh
      const [mealRes, distRes, sumRes] = await Promise.all([
        getMealById(id),
        getMealDistribution(id).catch(() => ({ data: { distribution: [] } })),
        getMealSummary(id).catch(() => ({ data: null })),
      ]);
      setIngredients(mealRes.data.ingredients || []);
      setDistribution(distRes.data.distribution || []);
      setSummary(normaliseSummary(sumRes.data));
      setEditIngredients(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update ingredients', 'error');
    } finally {
      setSavingIngredients(false);
    }
  };
  const locked = meal?.served_date ? !isToday(meal.served_date) : true;
  const nutrients = useMemo(() => breakdownArray(summary), [summary]);
  const insightNutrients = nutrients.filter((nutrient) => INSIGHT_KEYS.includes(nutrient.nutrient));

  if (loading) return <PageLoader />;
  if (!meal) return null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link to="/meals" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ArrowLeft size={14} /> Back to Meals
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{meal.name}</h1>
              {locked && (
                <Badge color="muted" className="gap-1">
                  <Lock size={10} /> Read-only
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {new Date(meal.served_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          {summary && (
            <Badge color={scoreBadgeColor(summary.score_label)} className="text-sm px-3 py-1">
              {summary.score_label || 'Score'} - {formatNumber(summary.score, 0)}
            </Badge>
          )}
        </div>
      </div>

      {summary ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-[320px_1fr] gap-6">
            <Card className="flex items-center justify-center p-6">
              <div className="text-center">
                <ScoreRing score={summary.score} label={summary.score_label} />
                <div className="mt-4 text-sm text-[var(--text-muted)]">Meal score</div>
                <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{summary.score_label}</div>
              </div>
            </Card>
            <Card>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Students</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mono">{summary.student_count || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Deficiencies</div>
                  <div className="text-2xl font-bold text-[var(--red)] mono">{summary.deficiencies?.length || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Calories/student</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mono">{formatNumber(summary.per_student?.calories)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Protein/student</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mono">{formatNumber(summary.per_student?.protein)}g</div>
                </div>
              </div>
              {summary.deficiencies?.length > 0 && (
                <div className="mt-5 p-4 bg-[var(--red-dim)] border border-[rgba(248,113,113,0.3)] rounded-[10px]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={15} className="text-[var(--red)]" />
                    <span className="text-sm font-semibold text-[var(--red)]">Nutrients needing improvement</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.deficiencies.map((item) => (
                      <Badge key={item} color="red">{NUTRIENT_META[item]?.label || item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nutrition Insight Cards</h2>
            </div>
            <NutrientInsightCards nutrients={insightNutrients} />
          </section>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Scale size={15} className="text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Adequacy Progress</h2>
              </div>
              <AdequacyProgressBars nutrients={insightNutrients} />
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={15} className="text-[var(--blue)]" />
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Provided vs Required</h2>
              </div>
              <NutrientComparisonChart nutrients={insightNutrients} />
            </Card>
          </div>

          <PmPoshanSection pmPoshan={summary.pm_poshan} />
          <SuggestionsSection suggestions={summary.suggestions} />
          <ExplanationSection explanation={summary.explanation} />
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No nutrition data yet"
          description="Add ingredients to this meal to see the score, PM POSHAN status, suggestions, and full analysis."
        />
      )}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Ingredients ({(editIngredients ?? ingredients).length})
            </h2>
            {!locked && (
              editIngredients ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditIngredients(null)}>Cancel</Button>
                  <Button size="sm" loading={savingIngredients} onClick={handleSaveIngredients}>Save</Button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" icon={Plus} onClick={startEditing}>Edit Ingredients</Button>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            {(editIngredients ?? ingredients).map((ingredient) => (
              <IngredientCard
                key={ingredient.ingredient_id ?? ingredient.id}
                ingredient={ingredient}
                locked={locked || !editIngredients}
                onRemove={handleRemove}
                onQtyChange={handleQtyChange}
              />
            ))}
            {editIngredients && <AddIngredientRow onAdd={handleAdd} />}
            {!locked && !editIngredients && ingredients.length === 0 && (
              <Button variant="secondary" icon={Plus} onClick={startEditing}>Add Ingredients</Button>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Automatic Distribution by Group
          </h2>
          <DistributionSection distribution={distribution} />
        </section>
      </div>
    </div>
  );
}