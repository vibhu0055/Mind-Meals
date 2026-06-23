import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMealById, getMealSummary, addMealIngredients, updateMealIngredient, deleteMealIngredient, clearMealIngredients, getIngredients, getIngredientCategories, getIngredientNutrition } from '../api/meals';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { PageLoader, EmptyState, Spinner } from '../components/ui/Spinner';
import {
  AdequacyProgressBars,
  PmPoshanComparisonChart,
  ScoreRing,
} from '../components/ui/Charts';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Layers,
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

const todayKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const normalizeDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(date));
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
  if (status === 'no_students') return 'muted';
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
  const nutrients = [
    { key: 'calories_per_100g', label: 'kcal', color: 'var(--amber)' },
    { key: 'protein_per_100g', label: 'pro', color: 'var(--blue)' },
    { key: 'carbs_per_100g', label: 'carb', color: 'var(--text-secondary)' },
    { key: 'iron_mg_per_100g', label: 'Fe', color: 'var(--text-muted)' },
    { key: 'calcium_mg_per_100g', label: 'Ca', color: 'var(--text-muted)' },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors">
      <Leaf size={12} className="text-[var(--accent)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{ingredientName(ingredient)}</span>
          {ingredient.category && <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{ingredient.category}</span>}
        </div>
        <div className="flex gap-3 mt-0.5">
          {nutrients.map(({ key, label, color }) => (
            <span key={key} className="text-[10px] mono" style={{ color }}>
              {formatNumber(ingredient[key])}<span className="text-[var(--text-muted)] ml-0.5">{label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {locked ? (
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Lock size={10} /> {formatNumber(ingredient.quantity_g, 0)}g
          </span>
        ) : (
          <>
            <input
              type="number"
              min="1"
              className="w-14 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] mono focus:outline-none"
              value={ingredient.quantity_g}
              onChange={(e) => onQtyChange(ingredient.ingredient_id ?? ingredient.id, e.target.value)}
            />
            <span className="text-[10px] text-[var(--text-muted)]">g</span>
            <button onClick={() => onRemove(ingredient.ingredient_id ?? ingredient.id)} className="text-[var(--text-muted)] hover:text-[var(--red)] ml-1">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddIngredientRow({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [catResults, setCatResults] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [catIngredients, setCatIngredients] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState('100');
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getIngredientCategories()
      .then((r) => setAllCategories(r.data?.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResults([]); setCatResults([]); setActiveCat(null); setCatIngredients([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (term) => {
    if (!term.trim()) { setResults([]); setCatResults([]); return; }
    setSearching(true);
    try {
      const [ingRes] = await Promise.all([
        getIngredients({ search: term, limit: 6 }),
      ]);
      const ingredients = ingRes.data.ingredients || [];
      const termLower = term.toLowerCase();
      const matchedCats = allCategories.filter((c) => c.toLowerCase().includes(termLower));
      setResults(ingredients);
      setCatResults(matchedCats.slice(0, 4));
      setActiveCat(null);
      setCatIngredients([]);
    } catch {
      setResults([]); setCatResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleQuery = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveCat(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const openCategory = async (cat) => {
    setActiveCat(cat);
    setLoadingCat(true);
    try {
      const res = await getIngredients({ category: cat, limit: 20 });
      setCatIngredients(res.data.ingredients || []);
    } catch {
      setCatIngredients([]);
    } finally {
      setLoadingCat(false);
    }
  };

  const pick = async (ing) => {
    let extraNutrition = {};
    try {
      const r = await getIngredientNutrition(ing.id);
      const data = r.data || {};
      const p = data.per_100g || {};
      extraNutrition = {
        calories_per_100g: p.calories_kcal ?? data.calories_per_100g,
        protein_per_100g: p.protein_g ?? data.protein_per_100g,
        carbs_per_100g: p.carbs_g ?? data.carbs_per_100g,
        fat_per_100g: p.fat_g ?? data.fat_per_100g,
        iron_mg_per_100g: p.iron_mg ?? data.iron_mg_per_100g,
        calcium_mg_per_100g: p.calcium_mg ?? data.calcium_mg_per_100g,
      };
    } catch {}
    onAdd({ ...ing, ...extraNutrition, ingredient_id: ing.id, quantity_g: parseFloat(qty) || 100 });
    setQuery(''); setResults([]); setCatResults([]); setActiveCat(null); setCatIngredients([]);
  };

  const hasDropdown = results.length > 0 || catResults.length > 0 || activeCat;

  return (
    <div className="relative mt-3" ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input placeholder="Search ingredients or categories..." value={query} onChange={handleQuery} icon={Search} />
          {searching && <div className="absolute right-3 top-9"><Spinner size={14} /></div>}

          {hasDropdown && (
            <div className="absolute z-20 w-full top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              {activeCat ? (
                <>
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-hover)] border-b border-[var(--border)] cursor-pointer hover:opacity-80"
                    onClick={() => { setActiveCat(null); setCatIngredients([]); }}
                  >
                    <ChevronLeft size={13} className="text-[var(--text-muted)]" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{activeCat}</span>
                  </div>
                  {loadingCat ? (
                    <div className="flex items-center justify-center py-6"><Spinner size={16} /></div>
                  ) : catIngredients.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[var(--text-muted)]">No ingredients in this category.</div>
                  ) : (
                    catIngredients.map((r) => (
                      <div key={r.id} onClick={() => pick(r)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border)] last:border-0">
                        <div>
                          <div className="text-sm text-[var(--text-primary)]">{r.display_name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{r.calories_per_100g} kcal · {r.protein_per_100g}g protein per 100g</div>
                        </div>
                        <Plus size={14} className="text-[var(--accent)] flex-shrink-0 ml-2" />
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {results.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-[var(--bg-hover)] border-b border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ingredients</span>
                      </div>
                      {results.map((r) => (
                        <div key={r.id} onClick={() => pick(r)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border)] last:border-0">
                          <div>
                            <div className="text-sm text-[var(--text-primary)]">{r.display_name}</div>
                            {r.category && <div className="text-xs text-[var(--text-muted)]">{r.category}</div>}
                          </div>
                          <Plus size={14} className="text-[var(--accent)] flex-shrink-0 ml-2" />
                        </div>
                      ))}
                    </>
                  )}
                  {catResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-[var(--bg-hover)] border-b border-[var(--border)]">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Categories</span>
                      </div>
                      {catResults.map((cat) => (
                        <div key={cat} onClick={() => openCategory(cat)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border)] last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                              <Layers size={11} className="text-[var(--accent)]" />
                            </div>
                            <span className="text-sm text-[var(--text-primary)]">{cat}</span>
                          </div>
                          <ChevronRight size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
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

function DistributionSection({ summary }) {
  const per = summary?.per_student;
  if (!per) {
    return (
      <EmptyState
        icon={Users}
        title="Distribution not available"
        description="Add ingredients to this meal to see per-student nutrient allocation."
      />
    );
  }

  const rows = [
    ['calories', 'Calories', 'kcal'],
    ['protein', 'Protein', 'g'],
    ['carbs', 'Carbs', 'g'],
    ['fat', 'Fat', 'g'],
    ['iron', 'Iron', 'mg'],
    ['calcium', 'Calcium', 'mg'],
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Per-Student Allocation</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{summary.student_count || 0} students</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {rows.map(([key, label, unit]) => (
          <div key={key} className="bg-[var(--bg-hover)] rounded px-2.5 py-2">
            <div className="text-[10px] uppercase text-[var(--text-muted)]">{label}</div>
            <div className="text-sm font-semibold text-[var(--text-primary)] mono">
              {formatNumber(Number(per[key] ?? 0))}<span className="text-[10px] text-[var(--text-muted)] ml-0.5">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PmPoshanSection({ pmPoshan }) {
  const ALL_LEVELS = [
    ['primary', 'Primary'],
    ['upper_primary', 'Upper Primary'],
  ];

  const rows = ALL_LEVELS.filter(([key]) => pmPoshan?.[key]);
  if (!rows.length) return null;

  const activeRows = rows.filter(([key]) => pmPoshan[key].status !== 'no_students');
  const emptyRows = rows.filter(([key]) => pmPoshan[key].status === 'no_students');

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={15} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">PM POSHAN Status</h2>
      </div>

      {activeRows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {activeRows.map(([key, label]) => {
              const data = pmPoshan[key];
              return (
                <div key={key} className="border border-[var(--border)] rounded-[10px] p-4 bg-[var(--bg-surface)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
                    <Badge color={pmStatusColor(data.status)}>{String(data.status || '').replace(/_/g, ' ')}</Badge>
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
        </>
      )}

      {emptyRows.length > 0 && (
        <div className={`flex flex-col gap-2 ${activeRows.length > 0 ? 'mt-3' : ''}`}>
          {emptyRows.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-[10px]">
              <div className="text-xs font-semibold text-[var(--text-muted)] w-24 flex-shrink-0">{label}</div>
              <div className="text-xs text-[var(--text-muted)] italic">
                Not applicable — no {label.toLowerCase()} classes set up yet. Assign a level to a class to enable this benchmark.
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMealById(id),
      getMealSummary(id).catch(() => ({ data: null })),
    ]).then(([mealRes, summaryRes]) => {
      const nextSummary = normaliseSummary(summaryRes.data);
      setMeal(mealRes.data.meal || summaryRes.data?.meal || null);
      setIngredients(mealRes.data.ingredients || []);
      setSummary(nextSummary);
    }).catch(() => {
      setMeal(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  const toast = useToast();
  const [editIngredients, setEditIngredients] = useState(null);
  const [originalIngredientIds, setOriginalIngredientIds] = useState([]);
  const [savingIngredients, setSavingIngredients] = useState(false);

  const sameId = (a, b) => String(a) === String(b);

  const startEditing = () => {
    const current = ingredients.map((i) => ({ ...i, ingredient_id: i.ingredient_id ?? i.id }));
    setOriginalIngredientIds(current.map((i) => i.ingredient_id));
    setEditIngredients(current);
  };

  const handleQtyChange = (ingredient_id, value) => {
    setEditIngredients((current) =>
      current.map((i) => sameId(i.ingredient_id, ingredient_id) ? { ...i, quantity_g: parseFloat(value) || 0 } : i)
    );
  };

  const handleRemove = (ingredient_id) => {
    setEditIngredients((current) => current.filter((i) => !sameId(i.ingredient_id, ingredient_id)));
  };

  const handleAdd = (ingredient) => {
    setEditIngredients((current) => {
      const exists = current.find((i) => sameId(i.ingredient_id, ingredient.ingredient_id));
      if (exists) return current.map((i) => sameId(i.ingredient_id, ingredient.ingredient_id) ? { ...i, quantity_g: ingredient.quantity_g } : i);
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
      const originalSet = new Set(originalIngredientIds.map(String));
      const keptIds = new Set(editIngredients.map((i) => String(i.ingredient_id)));
      const removedIds = originalIngredientIds.filter((origId) => !keptIds.has(String(origId)));

      if (removedIds.length === originalIngredientIds.length && originalIngredientIds.length > 0) {
        await clearMealIngredients(id);
      } else {
        await Promise.all(removedIds.map((origId) => deleteMealIngredient(id, origId)));
      }

      const originalMap = new Map(
        ingredients.map((i) => [String(i.ingredient_id ?? i.id), Number(i.quantity_g)])
      );
      const toUpdate = editIngredients.filter((i) => {
        const key = String(i.ingredient_id);
        return originalSet.has(key) && originalMap.get(key) !== Number(i.quantity_g);
      });
      await Promise.all(
        toUpdate.map(({ ingredient_id, quantity_g }) =>
          updateMealIngredient(id, ingredient_id, Number(quantity_g) || 0)
        )
      );

      const toAdd = editIngredients.filter((i) => !originalSet.has(String(i.ingredient_id)));
      if (toAdd.length > 0) {
        await addMealIngredients(
          id,
          toAdd.map(({ ingredient_id, quantity_g }) => ({
            ingredient_id: Number(ingredient_id),
            quantity_g: Number(quantity_g) || 0,
          }))
        );
      }

      toast('Ingredients updated', 'success');
      const [mealRes, sumRes] = await Promise.all([
        getMealById(id),
        getMealSummary(id).catch(() => ({ data: null })),
      ]);
      setIngredients(mealRes.data.ingredients || []);
      setSummary(normaliseSummary(sumRes.data));
      setEditIngredients(null);
      setOriginalIngredientIds([]);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update ingredients', 'error');
    } finally {
      setSavingIngredients(false);
    }
  };

  const handleClearAllIngredients = async () => {
    if (!confirm('Remove all ingredients from this meal?')) return;
    setSavingIngredients(true);
    try {
      await clearMealIngredients(id);
      toast('All ingredients cleared', 'success');
      const [mealRes, sumRes] = await Promise.all([
        getMealById(id),
        getMealSummary(id).catch(() => ({ data: null })),
      ]);
      setIngredients(mealRes.data.ingredients || []);
      setSummary(normaliseSummary(sumRes.data));
      setEditIngredients(null);
      setOriginalIngredientIds([]);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to clear ingredients', 'error');
    } finally {
      setSavingIngredients(false);
    }
  };

  const locked = summary != null ? summary.is_locked : (meal?.served_date ? !isToday(meal.served_date) : false);
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
                  <Lock size={10} /> Past meal
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {meal.served_date
                ? new Date(normalizeDate(meal.served_date) + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
                : ''}
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
            {/* Left column: PM Poshan + Distribution stacked */}
            <div className="flex flex-col gap-6">
              <section>
                <PmPoshanSection pmPoshan={summary.pm_poshan} />
              </section>
              <Card>
                <DistributionSection summary={summary} />
              </Card>
            </div>

            {/* Right column: Ingredients spanning full height */}
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
                    <div className="flex gap-2">
                      {ingredients.length > 0 && (
                        <Button variant="danger" size="sm" icon={Trash2} loading={savingIngredients} onClick={handleClearAllIngredients}>Clear all</Button>
                      )}
                      <Button variant="secondary" size="sm" icon={Plus} onClick={startEditing}>Edit Ingredients</Button>
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {editIngredients && <AddIngredientRow onAdd={handleAdd} />}
                {(editIngredients ?? ingredients).map((ingredient) => (
                  <IngredientCard
                    key={ingredient.ingredient_id ?? ingredient.id}
                    ingredient={ingredient}
                    locked={locked || !editIngredients}
                    onRemove={handleRemove}
                    onQtyChange={handleQtyChange}
                  />
                ))}
                {!locked && !editIngredients && ingredients.length === 0 && (
                  <Button variant="secondary" icon={Plus} onClick={startEditing}>Add Ingredients</Button>
                )}
              </div>
            </section>
          </div>

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
    </div>
  );
}