import type { Habit, CompletionMap } from '../lib/types';
import {
  startOfWeek,
  weekDays,
  addWeeks,
  addDays,
  toISODate,
  isSameDay,
  formatWeekRange,
  DAY_LABELS,
  DAY_NAMES,
} from '../lib/dates';
import {
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getLogsForRange,
  setCompletion,
} from './api';
import { DailyChart } from '../charts/daily';
import { WeeklyChart } from '../charts/weekly';
import { el, clear } from '../ui/dom';
import { icons } from '../ui/icons';
import { toast, errorMessage } from '../ui/toast';
import { openHabitForm, confirmDialog } from '../ui/modal';
import { signOut } from '../auth/auth';

const key = (habitId: string, dateISO: string) => `${habitId}|${dateISO}`;

export function renderDashboard(root: HTMLElement, userId: string, userEmail: string): void {
  clear(root);

  // ---- Estado ----
  let currentMonday = startOfWeek(new Date());
  let habits: Habit[] = [];
  let completion: CompletionMap = new Map();

  // ---- Layout estático (se construye una vez) ----
  const brand = el('div', { class: 'brand' }, [
    el('span', { class: 'brand__mark', 'aria-hidden': 'true' }),
    el('span', { class: 'brand__name' }, ['Constancia']),
  ]);

  const logoutBtn = el('button', { class: 'btn btn--ghost btn--icon-text' }, [
    icons.logout(),
    el('span', {}, ['Salir']),
  ]);
  logoutBtn.addEventListener('click', () => void signOut());

  const topbar = el('header', { class: 'topbar' }, [
    brand,
    el('div', { class: 'topbar__user' }, [
      el('span', { class: 'topbar__email', title: userEmail }, [userEmail]),
      logoutBtn,
    ]),
  ]);

  // Tarjeta: progreso de hoy (dona)
  const dailyCanvas = el('canvas', { 'aria-label': 'Progreso de hoy' }) as HTMLCanvasElement;
  const dailyCard = el('section', { class: 'card card--daily' }, [
    el('div', { class: 'card__head' }, [el('h2', { class: 'card__title' }, ['Hoy'])]),
    el('div', { class: 'donut-wrap' }, [dailyCanvas]),
  ]);

  // Tarjeta: resumen semanal (barras + métricas)
  const weeklyCanvas = el('canvas', { 'aria-label': 'Resumen semanal' }) as HTMLCanvasElement;
  const streakValue = el('span', { class: 'stat__value' }, ['0']);
  const weekPctValue = el('span', { class: 'stat__value' }, ['0%']);
  const weeklyCard = el('section', { class: 'card card--weekly' }, [
    el('div', { class: 'card__head' }, [
      el('h2', { class: 'card__title' }, ['Resumen semanal']),
      el('div', { class: 'stats' }, [
        el('div', { class: 'stat stat--flame' }, [
          icons.flame(),
          el('div', { class: 'stat__body' }, [
            streakValue,
            el('span', { class: 'stat__label' }, ['días de racha']),
          ]),
        ]),
        el('div', { class: 'stat' }, [
          el('div', { class: 'stat__body' }, [
            weekPctValue,
            el('span', { class: 'stat__label' }, ['de la semana']),
          ]),
        ]),
      ]),
    ]),
    el('div', { class: 'bars-wrap' }, [weeklyCanvas]),
  ]);

  const overview = el('div', { class: 'overview' }, [dailyCard, weeklyCard]);

  // Sección de la semana: navegación + tabla
  const rangeLabel = el('span', { class: 'weeknav__range' }, ['—']);
  const prevBtn = el('button', { class: 'btn btn--icon', 'aria-label': 'Semana anterior' }, [
    icons.chevronLeft(),
  ]);
  const nextBtn = el('button', { class: 'btn btn--icon', 'aria-label': 'Semana siguiente' }, [
    icons.chevronRight(),
  ]);
  const todayBtn = el('button', { class: 'btn btn--soft' }, ['Hoy']);
  const addBtn = el('button', { class: 'btn btn--primary btn--icon-text' }, [
    icons.plus(),
    el('span', {}, ['Hábito']),
  ]);

  prevBtn.addEventListener('click', () => {
    currentMonday = addWeeks(currentMonday, -1);
    void loadWeek();
  });
  nextBtn.addEventListener('click', () => {
    currentMonday = addWeeks(currentMonday, 1);
    void loadWeek();
  });
  todayBtn.addEventListener('click', () => {
    currentMonday = startOfWeek(new Date());
    void loadWeek();
  });
  addBtn.addEventListener('click', () => void onAddHabit());

  const weeknav = el('div', { class: 'weeknav' }, [
    el('div', { class: 'weeknav__left' }, [prevBtn, rangeLabel, nextBtn, todayBtn]),
    addBtn,
  ]);

  const tableWrap = el('div', { class: 'table-wrap' });
  const weekSection = el('section', { class: 'week' }, [weeknav, tableWrap]);

  const main = el('main', { class: 'dashboard' }, [overview, weekSection]);
  root.append(el('div', { class: 'app' }, [topbar, main]));

  // Los canvas ya están en el DOM: ahora sí se pueden crear las gráficas.
  const dailyChart = new DailyChart(dailyCanvas);
  const weeklyChart = new WeeklyChart(weeklyCanvas);

  // ---- Carga inicial ----
  void loadWeek();

  // ----------------------------------------------------------------
  //  Carga de datos de la semana visible
  // ----------------------------------------------------------------
  async function loadWeek(): Promise<void> {
    rangeLabel.textContent = formatWeekRange(currentMonday);
    showTableLoading();

    const days = weekDays(currentMonday);
    const startISO = toISODate(days[0]);
    const endISO = toISODate(days[6]);
    const todayISO = toISODate(new Date());

    try {
      habits = await listHabits();

      const logs = await getLogsForRange(startISO, endISO);
      completion = new Map();
      for (const log of logs) {
        if (log.completed) completion.set(key(log.habit_id, log.log_date), true);
      }

      // Si hoy no cae dentro de la semana visible, traemos su estado aparte
      // para que la dona de "Hoy" siempre sea correcta.
      const todayInWeek = days.some((d) => isSameDay(d, new Date()));
      if (!todayInWeek) {
        const todayLogs = await getLogsForRange(todayISO, todayISO);
        for (const log of todayLogs) {
          if (log.completed) completion.set(key(log.habit_id, log.log_date), true);
        }
      }

      renderTable(days, todayISO);
      recomputeCharts(days, todayISO);
      await refreshStreak();
    } catch (err) {
      toast(errorMessage(err, 'No se pudieron cargar tus hábitos.'), 'error');
      renderError();
    }
  }

  // ----------------------------------------------------------------
  //  Render de la tabla semanal
  // ----------------------------------------------------------------
  function renderTable(days: Date[], todayISO: string): void {
    clear(tableWrap);

    if (habits.length === 0) {
      tableWrap.append(renderEmptyState());
      return;
    }

    // Cabecera
    const headCells: HTMLElement[] = [el('th', { class: 'ht__habit-head' }, ['Hábito'])];
    days.forEach((d, i) => {
      const isToday = toISODate(d) === todayISO;
      headCells.push(
        el('th', { class: 'ht__day-head' + (isToday ? ' is-today' : '') }, [
          el('span', { class: 'ht__day-name' }, [DAY_LABELS[i]]),
          el('span', { class: 'ht__day-num' }, [String(d.getDate())]),
        ]),
      );
    });
    headCells.push(el('th', { class: 'ht__week-head' }, ['Semana']));
    headCells.push(el('th', { class: 'ht__actions-head', 'aria-label': 'Acciones' }, ['']));

    const thead = el('thead', {}, [el('tr', {}, headCells)]);

    // Filas
    const rows = habits.map((habit) => {
      const cells: HTMLElement[] = [];

      // Nombre del hábito con punto de color
      const dot = el('span', { class: 'ht__dot', 'aria-hidden': 'true' });
      dot.style.setProperty('--dot', habit.color);
      cells.push(
        el('td', { class: 'ht__habit' }, [
          el('div', { class: 'ht__habit-inner' }, [dot, el('span', {}, [habit.name])]),
        ]),
      );

      // Casillas por día
      let weekDone = 0;
      days.forEach((d, i) => {
        const dateISO = toISODate(d);
        const done = completion.get(key(habit.id, dateISO)) === true;
        if (done) weekDone++;
        const isToday = dateISO === todayISO;

        const box = el('button', {
          class: 'check' + (done ? ' check--on' : '') + (isToday ? ' check--today' : ''),
          role: 'checkbox',
          'aria-checked': String(done),
          'aria-label': `${DAY_NAMES[i]} ${d.getDate()}, ${habit.name}`,
          type: 'button',
        }, [icons.check()]);
        box.style.setProperty('--habit', habit.color);
        box.addEventListener('click', () => void onToggle(habit, dateISO, box));

        cells.push(el('td', { class: 'ht__cell' + (isToday ? ' is-today' : '') }, [box]));
      });

      // Cumplimiento del hábito en la semana
      cells.push(
        el('td', { class: 'ht__week' }, [
          el('span', { class: 'ht__week-frac' }, [`${weekDone}/7`]),
        ]),
      );

      // Acciones (editar / eliminar)
      const editBtn = el('button', { class: 'iconbtn', 'aria-label': `Editar ${habit.name}`, type: 'button' }, [
        icons.pencil(),
      ]);
      const delBtn = el('button', { class: 'iconbtn iconbtn--danger', 'aria-label': `Eliminar ${habit.name}`, type: 'button' }, [
        icons.trash(),
      ]);
      editBtn.addEventListener('click', () => void onEditHabit(habit));
      delBtn.addEventListener('click', () => void onDeleteHabit(habit));
      cells.push(el('td', { class: 'ht__actions' }, [el('div', { class: 'ht__actions-inner' }, [editBtn, delBtn])]));

      return el('tr', {}, cells);
    });

    const table = el('table', { class: 'ht' }, [thead, el('tbody', {}, rows)]);
    tableWrap.append(table);
  }

  // ----------------------------------------------------------------
  //  Marcar / desmarcar una casilla (actualización optimista)
  // ----------------------------------------------------------------
  async function onToggle(habit: Habit, dateISO: string, box: HTMLElement): Promise<void> {
    const wasDone = completion.get(key(habit.id, dateISO)) === true;
    const next = !wasDone;

    // Optimista: actualizamos la UI de inmediato.
    setBox(box, next, habit.color);
    if (next) completion.set(key(habit.id, dateISO), true);
    else completion.delete(key(habit.id, dateISO));

    const days = weekDays(currentMonday);
    const todayISO = toISODate(new Date());
    updateWeekFraction(box, habit.id, days);
    recomputeCharts(days, todayISO);

    try {
      await setCompletion(userId, habit.id, dateISO, next);
      // La racha solo puede cambiar si tocamos una fecha reciente.
      await refreshStreak();
    } catch (err) {
      // Revertir si falla.
      setBox(box, wasDone, habit.color);
      if (wasDone) completion.set(key(habit.id, dateISO), true);
      else completion.delete(key(habit.id, dateISO));
      updateWeekFraction(box, habit.id, days);
      recomputeCharts(days, todayISO);
      toast(errorMessage(err, 'No se pudo guardar el cambio.'), 'error');
    }
  }

  function setBox(box: HTMLElement, on: boolean, color: string): void {
    box.classList.toggle('check--on', on);
    box.setAttribute('aria-checked', String(on));
    box.style.setProperty('--habit', color);
  }

  /** Recalcula el "x/7" de la fila a la que pertenece la casilla. */
  function updateWeekFraction(box: HTMLElement, habitId: string, days: Date[]): void {
    const row = box.closest('tr');
    if (!row) return;
    const frac = row.querySelector('.ht__week-frac');
    if (!frac) return;
    let done = 0;
    for (const d of days) if (completion.get(key(habitId, toISODate(d))) === true) done++;
    frac.textContent = `${done}/7`;
  }

  // ----------------------------------------------------------------
  //  Gráficas
  // ----------------------------------------------------------------
  function recomputeCharts(days: Date[], todayISO: string): void {
    const total = habits.length;

    // Dona: progreso de HOY.
    let todayDone = 0;
    for (const h of habits) if (completion.get(key(h.id, todayISO)) === true) todayDone++;
    dailyChart.update(todayDone, total);

    // Barras: % por día de la semana visible.
    const percentages = days.map((d) => {
      if (total === 0) return 0;
      const iso = toISODate(d);
      let done = 0;
      for (const h of habits) if (completion.get(key(h.id, iso)) === true) done++;
      return (done / total) * 100;
    });
    const todayIndex = days.findIndex((d) => toISODate(d) === todayISO);
    weeklyChart.update(percentages, todayIndex);

    // Métrica: % de cumplimiento de la semana visible.
    const cells = total * 7;
    const filled = percentages.reduce((sum, p) => sum + (p / 100) * total, 0);
    weekPctValue.textContent = cells > 0 ? `${Math.round((filled / cells) * 100)}%` : '0%';
  }

  /** Racha: días consecutivos (hasta hoy) con al menos un hábito completado. */
  async function refreshStreak(): Promise<void> {
    try {
      const today = new Date();
      const startISO = toISODate(addDays(today, -89));
      const endISO = toISODate(today);
      const logs = await getLogsForRange(startISO, endISO);

      const activeDays = new Set<string>();
      for (const log of logs) if (log.completed) activeDays.add(log.log_date);

      let streak = 0;
      let cursor = new Date(today);
      // Si hoy aún no tiene actividad, la racha puede seguir viva desde ayer.
      if (!activeDays.has(toISODate(cursor))) cursor = addDays(cursor, -1);
      while (activeDays.has(toISODate(cursor))) {
        streak++;
        cursor = addDays(cursor, -1);
      }
      streakValue.textContent = String(streak);
    } catch {
      // La racha es secundaria: si falla, no interrumpimos la experiencia.
    }
  }

  // ----------------------------------------------------------------
  //  Acciones CRUD
  // ----------------------------------------------------------------
  async function onAddHabit(): Promise<void> {
    const result = await openHabitForm();
    if (!result) return;
    try {
      const position = habits.length;
      const created = await createHabit(userId, result.name, result.color, position);
      habits.push(created);
      const days = weekDays(currentMonday);
      renderTable(days, toISODate(new Date()));
      recomputeCharts(days, toISODate(new Date()));
      toast('Hábito agregado.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo crear el hábito.'), 'error');
    }
  }

  async function onEditHabit(habit: Habit): Promise<void> {
    const result = await openHabitForm({ name: habit.name, color: habit.color });
    if (!result) return;
    try {
      await updateHabit(habit.id, { name: result.name, color: result.color });
      habit.name = result.name;
      habit.color = result.color;
      const days = weekDays(currentMonday);
      renderTable(days, toISODate(new Date()));
      recomputeCharts(days, toISODate(new Date()));
      toast('Hábito actualizado.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo actualizar.'), 'error');
    }
  }

  async function onDeleteHabit(habit: Habit): Promise<void> {
    const ok = await confirmDialog(
      `¿Eliminar "${habit.name}"? También se borrarán sus registros.`,
    );
    if (!ok) return;
    try {
      await deleteHabit(habit.id);
      habits = habits.filter((h) => h.id !== habit.id);
      const days = weekDays(currentMonday);
      renderTable(days, toISODate(new Date()));
      recomputeCharts(days, toISODate(new Date()));
      await refreshStreak();
      toast('Hábito eliminado.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'No se pudo eliminar.'), 'error');
    }
  }

  // ----------------------------------------------------------------
  //  Estados auxiliares de la tabla
  // ----------------------------------------------------------------
  function showTableLoading(): void {
    clear(tableWrap);
    tableWrap.append(
      el('div', { class: 'state' }, [
        el('div', { class: 'spinner', 'aria-hidden': 'true' }),
        el('p', { class: 'state__text' }, ['Cargando tu semana…']),
      ]),
    );
  }

  function renderError(): void {
    clear(tableWrap);
    const retry = el('button', { class: 'btn btn--soft' }, ['Reintentar']);
    retry.addEventListener('click', () => void loadWeek());
    tableWrap.append(
      el('div', { class: 'state' }, [
        el('p', { class: 'state__text' }, ['No se pudieron cargar los datos.']),
        retry,
      ]),
    );
  }

  function renderEmptyState(): HTMLElement {
    const cta = el('button', { class: 'btn btn--primary btn--icon-text' }, [
      icons.plus(),
      el('span', {}, ['Crear mi primer hábito']),
    ]);
    cta.addEventListener('click', () => void onAddHabit());
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty__mark', 'aria-hidden': 'true' }, [icons.check()]),
      el('h3', { class: 'empty__title' }, ['Aún no tienes hábitos']),
      el('p', { class: 'empty__text' }, [
        'Agrega el primero y empieza a marcar tus días. Lo verás reflejado en las gráficas al instante.',
      ]),
      cta,
    ]);
  }
}
