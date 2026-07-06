import { el } from './dom';

/** Paleta de colores disponibles para los hábitos. */
export const HABIT_COLORS = [
  '#5b5bd6', // índigo (marca)
  '#0ea5e9', // cielo
  '#10b981', // esmeralda
  '#f59e0b', // ámbar
  '#ef4444', // rojo
  '#ec4899', // rosa
  '#8b5cf6', // violeta
  '#14b8a6', // teal
];

interface HabitFormResult {
  name: string;
  color: string;
}

/** Cierra el modal abierto, si lo hay. */
function dismiss(overlay: HTMLElement): void {
  overlay.classList.remove('modal--visible');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

/**
 * Abre un formulario modal para crear o editar un hábito.
 * Resuelve con los datos, o con null si se cancela.
 */
export function openHabitForm(initial?: { name: string; color: string }): Promise<HabitFormResult | null> {
  return new Promise((resolve) => {
    const isEdit = Boolean(initial);
    let selectedColor = initial?.color ?? HABIT_COLORS[0];

    const nameInput = el('input', {
      type: 'text',
      class: 'field__input',
      id: 'habit-name',
      placeholder: 'Ej. Leer 20 minutos',
      maxLength: 60,
      value: initial?.name ?? '',
    });

    const swatches = HABIT_COLORS.map((c) => {
      const b = el('button', {
        type: 'button',
        class: 'swatch' + (c === selectedColor ? ' swatch--active' : ''),
        'aria-label': `Color ${c}`,
        title: c,
      });
      b.style.setProperty('--swatch', c);
      b.addEventListener('click', () => {
        selectedColor = c;
        swatchRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('swatch--active'));
        b.classList.add('swatch--active');
      });
      return b;
    });
    const swatchRow = el('div', { class: 'swatch-row' }, swatches);

    const cancelBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Cancelar']);
    const saveBtn = el('button', { type: 'submit', class: 'btn btn--primary' }, [
      isEdit ? 'Guardar cambios' : 'Agregar hábito',
    ]);

    const form = el('form', { class: 'modal__card', role: 'dialog', 'aria-modal': 'true' }, [
      el('h2', { class: 'modal__title' }, [isEdit ? 'Editar hábito' : 'Nuevo hábito']),
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label', for: 'habit-name' }, ['Nombre']),
        nameInput,
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label' }, ['Color']),
        swatchRow,
      ]),
      el('div', { class: 'modal__actions' }, [cancelBtn, saveBtn]),
    ]);

    const overlay = el('div', { class: 'modal' }, [form]);

    const close = (result: HabitFormResult | null) => {
      dismiss(overlay);
      resolve(result);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      close({ name, color: selectedColor });
    });
    cancelBtn.addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener('keydown', function onEsc(ev) {
      if (ev.key === 'Escape') {
        document.removeEventListener('keydown', onEsc);
        close(null);
      }
    });

    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal--visible'));
    nameInput.focus();
  });
}

/** Diálogo de confirmación. Resuelve true si el usuario confirma. */
export function confirmDialog(message: string, confirmLabel = 'Eliminar'): Promise<boolean> {
  return new Promise((resolve) => {
    const cancelBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Cancelar']);
    const okBtn = el('button', { type: 'button', class: 'btn btn--danger' }, [confirmLabel]);

    const card = el('div', { class: 'modal__card', role: 'alertdialog', 'aria-modal': 'true' }, [
      el('p', { class: 'modal__message' }, [message]),
      el('div', { class: 'modal__actions' }, [cancelBtn, okBtn]),
    ]);
    const overlay = el('div', { class: 'modal' }, [card]);

    const close = (result: boolean) => {
      dismiss(overlay);
      resolve(result);
    };
    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal--visible'));
    okBtn.focus();
  });
}
