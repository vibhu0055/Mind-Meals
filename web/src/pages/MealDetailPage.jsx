import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMealById, getMealDistribution, distributeMeal } from '../api/meals';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { ArrowLeft, Send, Leaf } from 'lucide-react';

function NutriBar({ label, value, max, unit }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-primary)] mono">{value?.toFixed(1)}{unit}</span>
      </div>
      <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MealDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [meal, setMeal] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const canManage = user?.role === 'school' || user?.can_manage_meals;

  const load = async () => {
    try {
      const res = await getMealById(id);
      setMeal(res.data.meal);
      setIngredients(res.data.ingredients || []);
      // Try to load distribution
      try {
        const dr = await getMealDistribution(id);
        setDistribution(dr.data.distribution || []);
      } catch { /* not computed yet */ }
    } catch { toast('Failed to load meal', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      const res = await distributeMeal(id);
      setDistribution(res.data.distribution || []);
      toast('Distribution computed!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Distribution failed', 'error');
    } finally { setDistributing(false); }
  };

  if (loading) return <PageLoader />;
  if (!meal) return null;

  const mealTypeColor = { breakfast: 'amber', lunch: 'green', snack: 'blue', dinner: 'purple' };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link to="/meals" className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ArrowLeft size={14} /> Back to Meals
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{meal.name}</h1>
              <Badge color={mealTypeColor[meal.meal_type] || 'muted'}>{meal.meal_type}</Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {new Date(meal.served_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {canManage && (
            <Button icon={Send} loading={distributing} onClick={handleDistribute}>
              {distribution.length ? 'Re-Distribute' : 'Distribute'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ingredients */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Ingredients ({ingredients.length})
          </h2>
          <div className="flex flex-col gap-2">
            {ingredients.map((ing) => (
              <Card key={ing.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                  <Leaf size={14} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{ing.ingredient_name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{ing.quantity_g}g</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-muted)]">
                    {((ing.calories_per_100g || 0) * ing.quantity_g / 100).toFixed(0)} kcal
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    P: {((ing.protein_per_100g || 0) * ing.quantity_g / 100).toFixed(1)}g
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Distribution */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Distribution by Group
          </h2>
          {distribution.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">
                {canManage
                  ? 'Click "Distribute" to compute per-student nutrient allocation by age group.'
                  : 'Distribution not computed yet.'}
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {distribution.map((d) => (
                <Card key={d.group_label}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{d.group_label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{d.student_count} students</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <NutriBar label="Calories" value={d.calories_per_student} max={500} unit="kcal" />
                    <NutriBar label="Protein" value={d.protein_per_student} max={30} unit="g" />
                    <NutriBar label="Carbs" value={d.carbs_per_student} max={100} unit="g" />
                    <NutriBar label="Fat" value={d.fat_per_student} max={30} unit="g" />
                    {d.iron_per_student != null && (
                      <NutriBar label="Iron" value={d.iron_per_student} max={10} unit="mg" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
