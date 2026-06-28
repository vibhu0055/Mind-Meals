import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSchoolReports } from '../api/nutrition';
import { getStudents } from '../api/students';
import { getIngredients, getAiMealSuggestions, confirmAiMealSuggestion } from '../api/meals';
import { getInventory, updateInventory, deleteInventoryItem } from '../api/inventory';
import { useToast } from '../components/ui/Toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import {
  Sparkles, TrendingUp, ChevronDown, ChevronUp,
  Zap, Flame, Droplets, Leaf, Info,
  Package, Plus, Trash2, RefreshCw, CheckCircle2,
  ArrowRight, ChevronRight, Scale, Star,
  Loader2, UtensilsCrossed, AlertCircle,
  PackageOpen, Bot, Search, X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────
const NUTRIENTS = [
  { key: 'calories', col: 'calories_per_100g',   label: 'Calories', unit: 'kcal', icon: Flame,    color: 'var(--amber)'  },
  { key: 'protein',  col: 'protein_per_100g',    label: 'Protein',  unit: 'g',    icon: Zap,      color: 'var(--blue)'   },
  { key: 'iron',     col: 'iron_mg_per_100g',    label: 'Iron',     unit: 'mg',   icon: Droplets, color: 'var(--red)'    },
  { key: 'calcium',  col: 'calcium_mg_per_100g', label: 'Calcium',  unit: 'mg',   icon: Droplets, color: 'var(--purple)' },
  { key: 'fiber',    col: 'fiber_per_100g',      label: 'Fiber',    unit: 'g',    icon: Leaf,     color: 'var(--accent)' },
];

const REPORT_FIELDS = {
  calories: { received: 'received_calories', rda: 'rda_calories' },
  protein:  { received: 'received_protein',  rda: 'rda_protein'  },
  iron:     { received: 'received_iron',     rda: 'rda_iron'     },
  calcium:  { received: 'received_calcium',  rda: 'rda_calcium'  },
};

// ─── Small shared components ──────────────────────────────────
function DeficiencyBar({ label, avgPct, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-semibold" style={{ color }}>
          {avgPct != null ? `${avgPct}%` : 'No data'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(avgPct ?? 0, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function NutritionPills({ ing }) {
  const pills = NUTRIENTS
    .map((n) => {
      const val = parseFloat(ing[n.col]);
      if (isNaN(val) || val === 0) return null;
      return { label: n.label, val, unit: n.unit, color: n.color, icon: n.icon };
    })
    .filter(Boolean);

  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pills.map(({ label, val, unit, color, icon: Icon }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
          style={{ color, background: `${color}18`, borderColor: `${color}33` }}
        >
          <Icon size={9} />
          {label}: {val % 1 === 0 ? val : val.toFixed(1)}{unit}
        </span>
      ))}
    </div>
  );
}

// ─── Nutrient Breakdown (right column) ───────────────────────
function NutrientBreakdown({ nutrientStats, reports }) {
  const [openNutrient, setOpenNutrient] = useState(null);

  const breakdown = useMemo(() => {
    return nutrientStats
      .filter((n) => REPORT_FIELDS[n.key])
      .map((n) => {
        const fields = REPORT_FIELDS[n.key];
        const byStudent = {};
        reports.forEach((r) => {
          const received = parseFloat(r[fields.received]);
          const rda      = parseFloat(r[fields.rda]);
          if (isNaN(received) || isNaN(rda) || rda === 0) return;
          const pct = Math.round((received / rda) * 100);
          if (!byStudent[r.student_id]) {
            byStudent[r.student_id] = { name: r.student_name, total: 0, count: 0 };
          }
          byStudent[r.student_id].total += pct;
          byStudent[r.student_id].count++;
        });

        const students = Object.entries(byStudent)
          .map(([id, { name, total, count }]) => ({ id, name, avgPct: Math.round(total / count) }))
          .filter((s) => s.avgPct < 75)
          .sort((a, b) => a.avgPct - b.avgPct)
          .slice(0, 5);

        return { ...n, students };
      })
      .filter((n) => n.students.length > 0);
  }, [nutrientStats, reports]);

  if (breakdown.length === 0) {
    return (
      <Card>
        <div className="text-xs text-[var(--text-muted)] text-center py-6">
          No per-nutrient deficiencies found across students.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={14} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Most Deficient Students
        </h2>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Top students most deficient in each nutrient, based on their meal reports.
      </p>

      <div className="flex flex-col gap-2">
        {breakdown.map((n) => {
          const isOpen = openNutrient === n.key;
          return (
            <div key={n.key} className="rounded-[10px] border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setOpenNutrient(isOpen ? null : n.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${n.color}18` }}>
                  <n.icon size={12} style={{ color: n.color }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold" style={{ color: n.color }}>{n.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {n.students.length} student{n.students.length !== 1 ? 's' : ''} below 75%
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: n.color, background: `${n.color}18` }}>
                    avg {n.avgPct ?? '—'}%
                  </span>
                  {isOpen ? <ChevronUp size={12} className="text-[var(--text-muted)]" /> : <ChevronDown size={12} className="text-[var(--text-muted)]" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 flex flex-col gap-1.5">
                  {n.students.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-[var(--text-primary)] truncate">{s.name}</div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(s.avgPct, 100)}%`, background: s.avgPct < 50 ? 'var(--red)' : 'var(--amber)' }} />
                        </div>
                        <span className="text-[10px] font-bold w-8 text-right" style={{ color: s.avgPct < 50 ? 'var(--red)' : 'var(--amber)' }}>
                          {s.avgPct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Searchable ingredient combobox ──────────────────────────
function IngredientSearch({ ingredients, value, onChange }) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const containerRef            = useRef(null);
  const inputRef                = useRef(null);

  const selected = ingredients.find((i) => String(i.id) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 50);
    return ingredients.filter((i) => i.display_name.toLowerCase().includes(q)).slice(0, 50);
  }, [query, ingredients]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (ing) => {
    onChange(ing.id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        Ingredient
      </label>

      <div
        className="relative w-full rounded-[var(--radius)] border transition-all duration-150"
        style={{ borderColor: open || focused ? 'var(--accent-border)' : 'var(--border)' }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            placeholder="Search ingredient…"
            value={open ? query : (selected ? selected.display_name : '')}
            style={{ caretColor: 'var(--accent)' }}
            onFocus={() => { setOpen(true); setFocused(true); setQuery(''); }}
            onBlur={() => setFocused(false)}
            onChange={(e) => setQuery(e.target.value)}
            readOnly={!open}
          />
          {selected ? (
            <button type="button" onClick={handleClear} className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors">
              <X size={13} />
            </button>
          ) : (
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
            style={{ maxHeight: 220, overflowY: 'auto' }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[var(--text-muted)] text-center">No ingredients found</div>
            ) : (
              filtered.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(ing); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  style={{ background: String(ing.id) === String(value) ? 'var(--accent-dim)' : undefined,
                           color: String(ing.id) === String(value) ? 'var(--accent)' : undefined }}
                >
                  {ing.display_name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inventory Manager ────────────────────────────────────────
function InventoryManager({ ingredients, onInventoryChange }) {
  const toast = useToast();
  const [inventory, setInventory]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addForm, setAddForm]             = useState({ ingredient_id: '', quantity_kg: '' });
  const [submitting, setSubmitting]       = useState(false);
  const [deletingId, setDeletingId]       = useState(null);

  const loadInventory = async () => {
    try {
      const res = await getInventory();
      const items = res.data.inventory || res.data.items || res.data || [];
      setInventory(Array.isArray(items) ? items : []);
      onInventoryChange?.(Array.isArray(items) ? items : []);
    } catch {
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.ingredient_id || !addForm.quantity_kg) return;
    setSubmitting(true);
    try {
      await updateInventory([{
        ingredient_id: parseInt(addForm.ingredient_id),
        quantity_g: parseFloat(addForm.quantity_kg) * 1000,
      }]);
      toast('Stock updated!', 'success');
      setShowAddModal(false);
      setAddForm({ ingredient_id: '', quantity_kg: '' });
      loadInventory();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ingredient_id) => {
    if (!confirm('Remove this item from inventory?')) return;
    setDeletingId(ingredient_id);
    try {
      await deleteInventoryItem(ingredient_id);
      toast('Item removed', 'success');
      loadInventory();
    } catch {
      toast('Failed to remove item', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Ingredients not yet in inventory
  const inventoryIds = new Set(inventory.map((i) => String(i.ingredient_id)));
  const available = ingredients.filter((ing) => !inventoryIds.has(String(ing.id)));

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-[var(--blue)]" />
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Kitchen Inventory
            </h2>
          </div>
          <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
            Add Stock
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--blue-dim)] flex items-center justify-center mb-3">
              <PackageOpen size={20} className="text-[var(--blue)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">No stock added yet</div>
            <p className="text-xs text-[var(--text-muted)] mb-4 max-w-[220px]">
              Add ingredients your kitchen has available. The AI will only suggest meals using these items.
            </p>
            <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>Add Stock</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {inventory.map((item) => {
              const ing = ingredients.find((i) => String(i.id) === String(item.ingredient_id));
              const name = item.ingredient_name || ing?.display_name || `Ingredient #${item.ingredient_id}`;
              const kg   = `${(parseFloat(item.quantity_g) / 1000).toFixed(2).replace(/\.?0+$/, '')} kg`;

              return (
                <div
                  key={item.ingredient_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-[var(--bg-hover)] border border-[var(--border)] group"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">{name}</span>
                  <span className="text-xs font-semibold text-[var(--blue)] flex-shrink-0 mono">{kg}</span>
                  <button
                    onClick={() => handleDelete(item.ingredient_id)}
                    disabled={deletingId === item.ingredient_id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md text-[var(--red)] hover:bg-[var(--red-dim)]"
                  >
                    {deletingId === item.ingredient_id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Trash2 size={11} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {inventory.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[var(--blue-dim)] border border-[rgba(96,165,250,0.2)]">
            <Info size={11} className="text-[var(--blue)] flex-shrink-0" />
            <p className="text-[11px] text-[var(--blue)] opacity-80">
              {inventory.length} item{inventory.length !== 1 ? 's' : ''} in stock — AI will use these to build meal options.
            </p>
          </div>
        )}
      </Card>

      {/* Add stock modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add to Inventory">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <IngredientSearch
            ingredients={available}
            value={addForm.ingredient_id}
            onChange={(id) => setAddForm((f) => ({ ...f, ingredient_id: String(id) }))}
          />

          <Input
            label="Quantity (kg)"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="e.g. 5"
            value={addForm.quantity_kg}
            onChange={(e) => setAddForm((f) => ({ ...f, quantity_kg: e.target.value }))}
          />

          <div className="text-[11px] text-[var(--text-muted)] -mt-2">
            Enter the total stock available for the entire school in kilograms.
          </div>

          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit" disabled={!addForm.ingredient_id || !addForm.quantity_kg}>
              Add to Stock
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Nutrient stat pill (used in AI suggestion cards) ─────────
function NutrientStat({ label, value, unit, pct, color }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold mono" style={{ color }}>{value}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{unit}</span>
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      {pct != null && (
        <div className="h-1 rounded-full overflow-hidden mt-0.5" style={{ background: `${color}22` }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 120)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

// ─── Single AI suggestion card ────────────────────────────────
function AiSuggestionCard({ suggestion, index, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const { name, description, ingredients, estimated_per_student, pm_poshan_calories_pct, pm_poshan_protein_pct } = suggestion;

  const caloriesPct  = Math.round(pm_poshan_calories_pct ?? 0);
  const proteinPct   = Math.round(pm_poshan_protein_pct  ?? 0);
  const calColor     = caloriesPct >= 100 ? 'var(--accent)' : caloriesPct >= 80 ? 'var(--amber)' : 'var(--red)';
  const protColor    = proteinPct  >= 100 ? 'var(--accent)' : proteinPct  >= 80 ? 'var(--amber)' : 'var(--red)';

  const LABELS = ['A', 'B', 'C'];
  const ACCENT_COLORS = ['var(--accent)', 'var(--blue)', 'var(--purple)'];
  const accent = ACCENT_COLORS[index] || 'var(--accent)';

  return (
    <div
      onClick={() => onSelect(index)}
      className="relative rounded-[var(--radius-lg)] border-2 cursor-pointer transition-all duration-200"
      style={{
        borderColor: selected ? accent : 'var(--border)',
        background: selected ? `${accent}08` : 'var(--bg-card)',
        boxShadow: selected ? `0 0 0 1px ${accent}44, 0 4px 20px ${accent}18` : undefined,
      }}
    >
      {/* Selected checkmark */}
      {selected && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: accent }}
        >
          <CheckCircle2 size={14} style={{ color: '#0d0f14' }} />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3 pr-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: `${accent}18`, color: accent }}
          >
            {LABELS[index]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] leading-snug">{name}</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{description}</p>
          </div>
        </div>

        {/* PM-POSHAN compliance */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-[var(--bg-hover)] rounded-lg px-3 py-2">
            <div className="text-[10px] text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">Calories</div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold mono" style={{ color: calColor }}>{caloriesPct}%</span>
              <span className="text-[10px] text-[var(--text-muted)]">of target</span>
            </div>
          </div>
          <div className="flex-1 bg-[var(--bg-hover)] rounded-lg px-3 py-2">
            <div className="text-[10px] text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">Protein</div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold mono" style={{ color: protColor }}>{proteinPct}%</span>
              <span className="text-[10px] text-[var(--text-muted)]">of target</span>
            </div>
          </div>
        </div>

        {/* Per student nutrients */}
        {estimated_per_student && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { key: 'calories', label: 'Cal', unit: 'kcal', color: 'var(--amber)' },
              { key: 'protein',  label: 'Protein', unit: 'g', color: 'var(--blue)' },
              { key: 'iron',     label: 'Iron',  unit: 'mg', color: 'var(--red)' },
              { key: 'calcium',  label: 'Calcium', unit: 'mg', color: 'var(--purple)' },
              { key: 'fiber',    label: 'Fiber', unit: 'g', color: 'var(--accent)' },
            ].filter(n => estimated_per_student[n.key] != null).slice(0,6).map((n) => (
              <div key={n.key} className="flex items-baseline gap-0.5">
                <span className="text-xs font-bold mono" style={{ color: n.color }}>
                  {typeof estimated_per_student[n.key] === 'number'
                    ? estimated_per_student[n.key] % 1 === 0
                      ? estimated_per_student[n.key]
                      : estimated_per_student[n.key].toFixed(1)
                    : '—'}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">{n.unit} {n.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ingredients toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
          className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
        </button>

        {expanded && (
          <div className="mt-2 flex flex-col gap-1">
            {ingredients.map((ing) => {
              const kg = `${(ing.quantity_g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg`;
              return (
                <div key={ing.ingredient_id} className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)] truncate">{ing.display_name}</span>
                  <span className="text-[var(--text-muted)] mono ml-2 flex-shrink-0">{kg}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Suggestions Panel ─────────────────────────────────────
function AiSuggestionsPanel({ hasInventory }) {
  const toast = useToast();
  const [phase, setPhase]             = useState('idle'); // idle | loading | results | confirming | done
  const [suggestions, setSuggestions] = useState([]);
  const [meta, setMeta]               = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [confirming, setConfirming]   = useState(false);
  const [createdMeal, setCreatedMeal] = useState(null);

  const handleGenerate = async () => {
    setPhase('loading');
    setSelectedIdx(null);
    setSuggestions([]);
    setCreatedMeal(null);
    try {
      const res = await getAiMealSuggestions();
      const { suggestions: s, student_count, pm_poshan_targets } = res.data;
      setSuggestions(s || []);
      setMeta({ student_count, pm_poshan_targets });
      setPhase('results');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate suggestions', 'error');
      setPhase('idle');
    }
  };

  const handleConfirm = async () => {
    if (selectedIdx === null) return;
    const pick = suggestions[selectedIdx];
    setConfirming(true);
    try {
      const res = await confirmAiMealSuggestion({
        meal_name: pick.name,
        ingredients: pick.ingredients.map((i) => ({
          ingredient_id: i.ingredient_id,
          quantity_g: i.quantity_g,
        })),
      });
      setCreatedMeal(res.data.meal);
      setPhase('done');
      toast('Meal created successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to confirm meal', 'error');
    } finally {
      setConfirming(false);
    }
  };

  // ── Idle state ──
  if (phase === 'idle') {
    return (
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center mb-4">
            <Bot size={24} className="text-[var(--accent)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">AI Meal Suggestions</h3>
          <p className="text-xs text-[var(--text-muted)] mb-5 max-w-xs leading-relaxed">
            Gemini analyses your kitchen stock, student count, and PM-POSHAN targets to generate 3 ready-to-confirm meal options.
          </p>

          {!hasInventory ? (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.25)] rounded-[10px] text-left mb-4 max-w-xs">
              <AlertCircle size={13} className="text-[var(--amber)] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--amber)]">
                Add ingredients to your inventory first so the AI knows what's available in your kitchen.
              </p>
            </div>
          ) : null}

          <Button
            icon={Sparkles}
            onClick={handleGenerate}
            disabled={!hasInventory}
            size="md"
          >
            Suggest Today's Meal
          </Button>
        </div>
      </Card>
    );
  }

  // ── Loading state ──
  if (phase === 'loading') {
    return (
      <Card>
        <div className="flex flex-col items-center py-10 text-center">
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--accent-border)] flex items-center justify-center">
              <Sparkles size={22} className="text-[var(--accent)]" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Generating meal options…</div>
          <p className="text-xs text-[var(--text-muted)] max-w-[220px] leading-relaxed">
            Gemini is analysing your inventory and PM-POSHAN targets. This takes a few seconds.
          </p>
        </div>
      </Card>
    );
  }

  // ── Done / created ──
  if (phase === 'done' && createdMeal) {
    return (
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center mb-4">
            <CheckCircle2 size={26} className="text-[var(--accent)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Meal Created!</h3>
          <p className="text-sm text-[var(--text-muted)] mb-1">"{createdMeal.name}"</p>
          <p className="text-xs text-[var(--text-muted)] mb-5">
            Nutrition score, summary, and deficiency suggestions are now available.
          </p>
          <div className="flex gap-3">
            <Link to={`/meals/${createdMeal.id}`}>
              <Button icon={ArrowRight} size="md">View Meal</Button>
            </Link>
            <Button variant="secondary" size="md" icon={RefreshCw} onClick={() => { setPhase('idle'); setCreatedMeal(null); }}>
              New Suggestion
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ── Results ──
  return (
    <div className="flex flex-col gap-4">
      {/* Meta row */}
      {meta && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Bot size={14} className="text-[var(--accent)] flex-shrink-0" />
          <span className="text-xs text-[var(--text-muted)]">
            Designed for <span className="font-semibold text-[var(--text-primary)]">{meta.student_count} students</span>
            {meta.pm_poshan_targets && (
              <> · PM-POSHAN target: <span className="font-semibold text-[var(--text-primary)]">{meta.pm_poshan_targets.calories} kcal</span>, <span className="font-semibold text-[var(--text-primary)]">{meta.pm_poshan_targets.protein}g protein</span> per student</>
            )}
          </span>
          <button
            onClick={handleGenerate}
            className="ml-auto flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
          >
            <RefreshCw size={11} /> Regenerate
          </button>
        </div>
      )}

      {/* Suggestion cards */}
      {suggestions.map((s, i) => (
        <AiSuggestionCard
          key={i}
          suggestion={s}
          index={i}
          selected={selectedIdx === i}
          onSelect={setSelectedIdx}
        />
      ))}

      {/* Confirm button */}
      <div className="sticky bottom-4">
        <Button
          className="w-full"
          size="lg"
          icon={CheckCircle2}
          disabled={selectedIdx === null}
          loading={confirming}
          onClick={handleConfirm}
        >
          {selectedIdx === null
            ? 'Select a meal option above'
            : `Confirm "${suggestions[selectedIdx]?.name}"`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MealPlannerPage() {
  const toast = useToast();
  const [loading, setLoading]         = useState(true);
  const [reports, setReports]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Active tab: 'ai' | 'analytics'
  const [activeTab, setActiveTab] = useState('ai');

  useEffect(() => {
    Promise.all([
      getSchoolReports({}).catch(() => ({ data: { reports: [] } })),
      getStudents().catch(() => ({ data: { students: [] } })),
      getIngredients({ limit: 1000 }).catch(() => ({ data: { ingredients: [] } })),
    ]).then(([r, s, ing]) => {
      setReports(r.data.reports || []);
      setStudents(s.data.students || []);
      setIngredients(ing.data.ingredients || []);
    }).catch(() => toast('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const nutrientStats = useMemo(() => {
    return NUTRIENTS.map((n) => {
      const fields = REPORT_FIELDS[n.key];
      if (!fields) return { ...n, avgPct: null, deficient: false };

      const vals = reports
        .map((r) => {
          const received = parseFloat(r[fields.received]);
          const rda      = parseFloat(r[fields.rda]);
          return (!isNaN(received) && !isNaN(rda) && rda > 0)
            ? Math.round((received / rda) * 100)
            : null;
        })
        .filter((v) => v !== null);

      const avgPct = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      return { ...n, avgPct, deficient: avgPct != null && avgPct < 75 };
    });
  }, [reports]);

  const neededNutrients   = nutrientStats.filter((n) => n.deficient);
  const deficientStudents = [...new Set(reports.map((r) => r.student_id))].length;
  const hasInventory      = inventoryItems.length > 0;

  const rankedIngredients = useMemo(() => {
    if (!neededNutrients.length || !ingredients.length) return [];
    return ingredients
      .map((ing) => {
        let score = 0;
        neededNutrients.forEach((n) => {
          const val = parseFloat(ing[n.col]);
          if (!isNaN(val) && val > 0) {
            const weight = Math.max(0, (100 - n.avgPct) / 100);
            score += weight * (val / 100);
          }
        });
        return { ing, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [ingredients, neededNutrients]);

  if (loading) return <PageLoader />;

  const tabs = [
    { key: 'ai',        label: 'AI Suggestions', icon: Sparkles },
    { key: 'analytics', label: 'Nutrition Analytics', icon: TrendingUp },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Smart Meal Planner"
        description="AI-powered meal suggestions and school-wide nutrition analytics"
      />

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border)] mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === key ? 'var(--accent)' : 'transparent',
              color: activeTab === key ? '#0d0f14' : 'var(--text-muted)',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── AI Suggestions tab ── */}
      {activeTab === 'ai' && (
        <div className="flex gap-5 items-start">
          {/* Left: Inventory + AI Panel */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            <InventoryManager
              ingredients={ingredients}
              onInventoryChange={setInventoryItems}
            />
            <AiSuggestionsPanel hasInventory={hasInventory} />
          </div>

          {/* Right column */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4">
            {/* Quick stats */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Scale size={13} className="text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">School Overview</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Students with deficiencies', value: deficientStudents, color: 'var(--red)' },
                  { label: 'Nutrients below target',     value: neededNutrients.length, color: neededNutrients.length > 0 ? 'var(--amber)' : 'var(--accent)' },
                  { label: 'Reports analysed',           value: reports.length, color: 'var(--blue)' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-hover)] rounded-[8px]">
                    <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
                    <span className="text-sm font-bold mono" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Deficiency summary */}
            {nutrientStats.some(n => n.avgPct != null) && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} className="text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nutrient Adequacy</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {nutrientStats.map((n) => (
                    <DeficiencyBar
                      key={n.key}
                      label={n.label}
                      avgPct={n.avgPct}
                      color={
                        n.avgPct == null ? 'var(--text-muted)'
                        : n.avgPct >= 75 ? 'var(--accent)'
                        : n.avgPct >= 50 ? 'var(--amber)'
                        : 'var(--red)'
                      }
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics tab ── */}
      {activeTab === 'analytics' && (
        reports.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No nutrition data yet"
            description="Generate nutrition reports on the Nutrition page first. The planner uses those reports to identify what the school needs most."
          />
        ) : (
          <div className="flex gap-5 items-start">
            {/* Left column */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    School Nutrition Overview
                  </h2>
                </div>
                <div className="flex gap-4 mb-4 text-center">
                  {[
                    { value: deficientStudents, label: 'students with deficiencies', color: 'var(--text-primary)' },
                    { value: neededNutrients.length, label: 'nutrients below target', color: 'var(--red)' },
                    { value: reports.length, label: 'reports analysed', color: 'var(--accent)' },
                  ].map(({ value, label, color }) => (
                    <div key={label} className="flex-1 bg-[var(--bg-hover)] rounded-[10px] py-3 px-2">
                      <div className="text-xl font-bold" style={{ color }}>{value}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  {nutrientStats.map((n) => (
                    <DeficiencyBar
                      key={n.key}
                      label={`${n.label} avg adequacy`}
                      avgPct={n.avgPct}
                      color={
                        n.avgPct == null ? 'var(--text-muted)'
                        : n.avgPct >= 75  ? 'var(--accent)'
                        : n.avgPct >= 50  ? 'var(--amber)'
                        : 'var(--red)'
                      }
                    />
                  ))}
                </div>
              </Card>

              {/* Recommended ingredients */}
              {rankedIngredients.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={15} className="text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Recommended Ingredients
                    </h2>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Ingredients that best address your school's current nutrient gaps.
                  </p>
                  <div className="flex flex-col gap-3">
                    {rankedIngredients.slice(0, 5).map(({ ing }, i) => (
                      <div key={ing.id} className="px-3 py-2.5 bg-[var(--bg-hover)] rounded-[10px] border border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-md bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-[var(--text-primary)] font-semibold flex-1">{ing.display_name}</span>
                          {ing.category && <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{ing.category}</span>}
                        </div>
                        <NutritionPills ing={ing} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mt-3 p-2.5 bg-[var(--accent-dim)] rounded-[8px]">
                    <Info size={12} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[var(--accent)] opacity-80">
                      These are ranked by impact on your school's deficiencies. Choose what's practical for your kitchen.
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Right column */}
            <div className="w-80 flex-shrink-0">
              <NutrientBreakdown nutrientStats={nutrientStats} reports={reports} />
            </div>
          </div>
        )
      )}
    </div>
  );
}