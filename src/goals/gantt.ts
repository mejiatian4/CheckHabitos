import type { Goal, GoalTerm } from '../lib/types';
import { toISODate } from '../lib/dates';
import { el, clear } from '../ui/dom';
import { icons } from '../ui/icons';

const TERMS: GoalTerm[] = ['short', 'medium', 'long'];
const TERM_LABELS: Record<GoalTerm, string> = {
  short: 'Corto plazo',
  medium: 'Mediano plazo',
  long: 'Largo plazo',
};

const MONTH_WIDTH_PX = 130;

type DatedGoal = Goal & { start_date: string; end_date: string };

function monthLabel(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString('es', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function daysInMonthOf(dateISO: string): number {
  const [y, m] = dateISO.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Formatea 'YYYY-MM-DD' como "15 ago 2026", sin desfases de zona horaria. */
function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

/**
 * Pinta el cronograma (Gantt) de las metas que tienen fecha de inicio y fin.
 * Las metas sin ambas fechas no participan del cronograma, pero sí siguen
 * apareciendo en el tablero de columnas.
 */
export function renderGantt(container: HTMLElement, goals: Goal[]): void {
  clear(container);

  const dated = goals.filter((g): g is DatedGoal => Boolean(g.start_date && g.end_date));

  if (dated.length === 0) {
    container.append(
      el('p', { class: 'state__text gantt__empty' }, [
        'Agrega fecha de inicio y fin a tus metas para verlas aquí en el cronograma.',
      ]),
    );
    return;
  }

  const todayISO = toISODate(new Date());

  let minDateISO = dated[0].start_date;
  let maxDateISO = dated[0].end_date;
  for (const g of dated) {
    if (g.start_date < minDateISO) minDateISO = g.start_date;
    if (g.end_date > maxDateISO) maxDateISO = g.end_date;
  }
  if (minDateISO > todayISO) minDateISO = todayISO;
  if (maxDateISO < todayISO) maxDateISO = todayISO;

  const [minY, minM] = minDateISO.split('-').map(Number);
  const [maxY, maxM] = maxDateISO.split('-').map(Number);
  const rangeStartYear = minY;
  const rangeStartMonth = minM - 1; // 0-based
  const monthsCount = (maxY - minY) * 12 + (maxM - minM) + 1;

  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < monthsCount; i++) {
    const total = rangeStartMonth + i;
    months.push({ year: rangeStartYear + Math.floor(total / 12), month: ((total % 12) + 12) % 12 });
  }

  /** Posición de una fecha en "unidades de mes" relativas al inicio del rango. */
  function monthUnits(dateISO: string): number {
    const [y, m, d] = dateISO.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthOffset = (y - rangeStartYear) * 12 + (m - 1 - rangeStartMonth);
    return monthOffset + (d - 1) / daysInMonth;
  }

  const timelineWidth = monthsCount * MONTH_WIDTH_PX;

  const header = el(
    'div',
    { class: 'gantt__header' },
    months.map(({ year, month }) =>
      el('div', { class: 'gantt__month', style: `width:${MONTH_WIDTH_PX}px` }, [monthLabel(year, month)]),
    ),
  );

  const clampedToday = todayISO < minDateISO ? minDateISO : todayISO > maxDateISO ? maxDateISO : todayISO;
  const todayLeftPct = (monthUnits(clampedToday) / monthsCount) * 100;
  const todayLine = el('div', { class: 'gantt__today', style: `left:${todayLeftPct}%` }, [
    el('span', { class: 'gantt__today-label' }, ['Hoy']),
  ]);

  const labelItems: HTMLElement[] = [];
  const rowItems: HTMLElement[] = [];

  for (const term of TERMS) {
    const termGoals = dated
      .filter((g) => g.term === term)
      .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
    if (termGoals.length === 0) continue;

    labelItems.push(el('div', { class: 'gantt__group-label' }, [TERM_LABELS[term]]));
    rowItems.push(el('div', { class: 'gantt__group-spacer' }));

    for (const goal of termGoals) {
      const left = monthUnits(goal.start_date);
      const right = monthUnits(goal.end_date) + 1 / daysInMonthOf(goal.end_date);
      const leftPct = (left / monthsCount) * 100;
      const widthPct = Math.max(((right - left) / monthsCount) * 100, 1.2);
      const overdue = !goal.completed && goal.end_date < todayISO;

      const barChildren: Node[] = [];
      if (goal.completed) barChildren.push(icons.check());

      const bar = el(
        'div',
        {
          class:
            'gantt__bar' +
            ` gantt__bar--${term}` +
            (goal.completed ? ' gantt__bar--done' : '') +
            (overdue ? ' gantt__bar--overdue' : ''),
          style: `left:${leftPct}%; width:${widthPct}%`,
          title: `${goal.title} · ${formatShortDate(goal.start_date)} – ${formatShortDate(goal.end_date)}`,
        },
        barChildren,
      );

      labelItems.push(el('div', { class: 'gantt__row-label', title: goal.title }, [goal.title]));
      rowItems.push(el('div', { class: 'gantt__row' }, [bar]));
    }
  }

  const labelsCol = el('div', { class: 'gantt__labels' }, [
    el('div', { class: 'gantt__labels-spacer' }),
    ...labelItems,
  ]);
  const body = el('div', { class: 'gantt__body' }, [todayLine, ...rowItems]);
  const timeline = el('div', { class: 'gantt__timeline', style: `width:${timelineWidth}px` }, [header, body]);
  const scrollArea = el('div', { class: 'gantt__scroll' }, [timeline]);

  container.append(el('div', { class: 'gantt' }, [labelsCol, scrollArea]));
}
