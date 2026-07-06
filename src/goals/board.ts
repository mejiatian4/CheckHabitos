import type { Goal, GoalTerm } from '../lib/types';
import { toISODate } from '../lib/dates';
import { listGoals, createGoal, updateGoal, deleteGoal } from './api';
import { el, clear } from '../ui/dom';
import { icons } from '../ui/icons';
import { toast, errorMessage } from '../ui/toast';
import { openGoalForm, confirmDialog } from '../ui/modal';

const TERMS: GoalTerm[] = ['short', 'medium', 'long'];
const TERM_LABELS: Record<GoalTerm, string> = {
  short: 'Corto plazo',
  medium: 'Mediano plazo',
  long: 'Largo plazo',
};

/** Formatea 'YYYY-MM-DD' como "15 ago 2026", sin desfases de zona horaria. */
function formatGoalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
}

export async function renderGoalsBoard(root: HTMLElement, userId: string): Promise<void> {
  clear(root);

  let goals: Goal[] = [];
  const columns = new Map<GoalTerm, HTMLElement>();

  const board = el(
    'div',
    { class: 'goals-board' },
    TERMS.map((term) => {
      const list = el('div', { class: 'goal-list' });
      columns.set(term, list);

      const addBtn = el('button', { class: 'btn btn--soft btn--block', type: 'button' }, [
        icons.plus(),
        el('span', {}, ['Nueva meta']),
      ]);
      addBtn.addEventListener('click', () => void onAddGoal(term));

      return el('section', { class: 'goal-column' }, [
        el('div', { class: 'goal-column__head' }, [
          el('h2', { class: 'goal-column__title' }, [TERM_LABELS[term]]),
        ]),
        list,
        addBtn,
      ]);
    }),
  );

  root.append(board);
  await loadGoals();

  async function loadGoals(): Promise<void> {
    for (const term of TERMS) {
      clear(columns.get(term)!);
      columns.get(term)!.append(el('div', { class: 'spinner spinner--sm', 'aria-hidden': 'true' }));
    }
    try {
      goals = await listGoals();
      renderColumns();
    } catch (err) {
      toast(errorMessage(err, 'No se pudieron cargar tus metas.'), 'error');
      for (const term of TERMS) {
        clear(columns.get(term)!);
        columns.get(term)!.append(el('p', { class: 'state__text' }, ['No se pudo cargar.']));
      }
    }
  }

  function renderColumns(): void {
    for (const term of TERMS) {
      const list = columns.get(term)!;
      clear(list);
      const termGoals = goals.filter((g) => g.term === term);
      if (termGoals.length === 0) {
        list.append(el('p', { class: 'goal-empty' }, ['Sin metas todavía.']));
        continue;
      }
      for (const goal of termGoals) list.append(renderGoalCard(goal));
    }
  }

  function renderGoalCard(goal: Goal): HTMLElement {
    const toggleBtn = el(
      'button',
      {
        class: 'goal-check' + (goal.completed ? ' goal-check--on' : ''),
        type: 'button',
        'aria-label': goal.completed ? 'Marcar como pendiente' : 'Marcar como cumplida',
      },
      [icons.check()],
    );
    toggleBtn.addEventListener('click', () => void onToggleGoal(goal));

    const editBtn = el(
      'button',
      { class: 'iconbtn', type: 'button', 'aria-label': `Editar ${goal.title}` },
      [icons.pencil()],
    );
    editBtn.addEventListener('click', () => void onEditGoal(goal));

    const delBtn = el(
      'button',
      { class: 'iconbtn iconbtn--danger', type: 'button', 'aria-label': `Eliminar ${goal.title}` },
      [icons.trash()],
    );
    delBtn.addEventListener('click', () => void onDeleteGoal(goal));

    const bodyChildren: (Node | string)[] = [el('span', { class: 'goal-card__title' }, [goal.title])];
    if (goal.description) {
      bodyChildren.push(el('p', { class: 'goal-card__desc' }, [goal.description]));
    }
    if (goal.target_date) {
      const overdue = !goal.completed && goal.target_date < toISODate(new Date());
      bodyChildren.push(
        el('span', { class: 'goal-card__date' + (overdue ? ' goal-card__date--overdue' : '') }, [
          `${overdue ? 'Vencida' : 'Meta'}: ${formatGoalDate(goal.target_date)}`,
        ]),
      );
    }

    return el('div', { class: 'goal-card' + (goal.completed ? ' goal-card--done' : '') }, [
      toggleBtn,
      el('div', { class: 'goal-card__body' }, bodyChildren),
      el('div', { class: 'goal-card__actions' }, [editBtn, delBtn]),
    ]);
  }

  async function onAddGoal(term: GoalTerm): Promise<void> {
    const result = await openGoalForm(undefined, term);
    if (!result) return;
    try {
      const created = await createGoal(userId, {
        title: result.title,
        description: result.description,
        term: result.term,
        target_date: result.targetDate,
      });
      goals.push(created);
      renderColumns();
      toast('Meta agregada.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo crear la meta.'), 'error');
    }
  }

  async function onEditGoal(goal: Goal): Promise<void> {
    const result = await openGoalForm({
      title: goal.title,
      description: goal.description,
      term: goal.term,
      targetDate: goal.target_date,
    });
    if (!result) return;
    try {
      await updateGoal(goal.id, {
        title: result.title,
        description: result.description,
        term: result.term,
        target_date: result.targetDate,
      });
      goal.title = result.title;
      goal.description = result.description;
      goal.term = result.term;
      goal.target_date = result.targetDate;
      renderColumns();
      toast('Meta actualizada.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo actualizar la meta.'), 'error');
    }
  }

  async function onToggleGoal(goal: Goal): Promise<void> {
    const next = !goal.completed;
    goal.completed = next;
    renderColumns();
    try {
      await updateGoal(goal.id, { completed: next });
    } catch (err) {
      goal.completed = !next;
      renderColumns();
      toast(errorMessage(err, 'No se pudo actualizar la meta.'), 'error');
    }
  }

  async function onDeleteGoal(goal: Goal): Promise<void> {
    const ok = await confirmDialog(`¿Eliminar la meta "${goal.title}"?`);
    if (!ok) return;
    try {
      await deleteGoal(goal.id);
      goals = goals.filter((g) => g.id !== goal.id);
      renderColumns();
      toast('Meta eliminada.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo eliminar.'), 'error');
    }
  }
}
