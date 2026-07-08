import { el } from './dom';

/** Frases estoicas y de disciplina/hábitos, en español. */
const QUOTES: { text: string; author: string }[] = [
  {
    text: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.',
    author: 'Aristóteles',
  },
  {
    text: 'Lo que obstaculiza la acción, hace avanzar la acción. Lo que se interpone en el camino, se convierte en el camino.',
    author: 'Marco Aurelio',
  },
  {
    text: 'No son las cosas las que perturban a los hombres, sino los juicios que se hacen sobre ellas.',
    author: 'Epicteto',
  },
  {
    text: 'No es que tengamos poco tiempo, sino que perdemos mucho.',
    author: 'Séneca',
  },
  {
    text: 'Cada acción que realizas es un voto por el tipo de persona en la que quieres convertirte.',
    author: 'James Clear',
  },
  {
    text: 'El hombre que mueve una montaña comienza cargando pequeñas piedras.',
    author: 'Confucio',
  },
  {
    text: 'No importa qué tan lento vayas, siempre y cuando no te detengas.',
    author: 'Confucio',
  },
  {
    text: 'Un viaje de mil millas comienza con un solo paso.',
    author: 'Lao Tsé',
  },
  {
    text: 'El alma se tiñe del color de sus pensamientos.',
    author: 'Marco Aurelio',
  },
  {
    text: 'Primero di a ti mismo lo que quieres ser, y luego haz lo que tengas que hacer.',
    author: 'Epicteto',
  },
  {
    text: 'Toda vida es larga si se sabe usar.',
    author: 'Séneca',
  },
  {
    text: 'El carácter del hombre es su destino.',
    author: 'Heráclito',
  },
  {
    text: 'Tienes poder sobre tu mente, no sobre los eventos externos. Date cuenta de esto y encontrarás fortaleza.',
    author: 'Marco Aurelio',
  },
  {
    text: 'Deja de discutir sobre cómo debe ser un buen hombre, y simplemente sé uno.',
    author: 'Marco Aurelio',
  },
  {
    text: 'Empieza a vivir ya, y cuenta cada día como si fuera una vida completa en sí misma.',
    author: 'Séneca',
  },
  {
    text: 'No hay viento favorable para el que no sabe a qué puerto se dirige.',
    author: 'Séneca',
  },
  {
    text: 'No busques que las cosas sucedan como tú quieres, sino desea que sucedan como suceden, y tendrás paz.',
    author: 'Epicteto',
  },
  {
    text: 'La riqueza no consiste en tener grandes posesiones, sino en tener pocas necesidades.',
    author: 'Epicteto',
  },
  {
    text: 'El que no avanza, retrocede.',
    author: 'Confucio',
  },
  {
    text: 'Todo lo que oyes, dite primero a ti mismo: es la opinión de alguien, no un hecho.',
    author: 'Marco Aurelio',
  },
  {
    text: 'La disciplina es el puente entre las metas y los logros.',
    author: 'Jim Rohn',
  },
  {
    text: 'Bien hecho es mejor que bien dicho.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'La paciencia es amarga, pero su fruto es dulce.',
    author: 'Aristóteles',
  },
  {
    text: 'Los hábitos son el interés compuesto de la superación personal.',
    author: 'James Clear',
  },
];

const ROTATE_MS = 7000;
const OUT_MS = 420;
const IN_MS = 550;
const SLIDE_PX = 34;
// Curva "ease-out" pronunciada: entra con desaceleración suave, sin rebote
// ni golpe seco. La salida usa una curva simétrica más discreta.
const EASE_IN = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_OUT = 'cubic-bezier(0.4, 0, 1, 1)';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Tarjeta de frases estoicas/motivadoras que va rotando sola cada 7 segundos,
 * con un cruce de desvanecido suave (la frase sale con un leve desplazamiento
 * hacia arriba y entra la siguiente desde abajo, con una curva de easing
 * pensada para que se sienta lenta y natural, no mecánica).
 */
export function createQuoteCard(): HTMLElement {
  const order = shuffle(QUOTES.map((_, i) => i));
  let pos = 0;

  const textEl = el('p', { class: 'quote-card__text' }, [QUOTES[order[0]].text]);
  const authorEl = el('span', { class: 'quote-card__author' }, [`— ${QUOTES[order[0]].author}`]);
  const body = el('div', { class: 'quote-card__body' }, [textEl, authorEl]);

  const card = el('section', { class: 'card card--quote', 'aria-live': 'off' }, [
    el('span', { class: 'quote-card__mark', 'aria-hidden': 'true' }, ['“']),
    body,
  ]);

  // Reserva la altura de la frase más larga (medida con el ancho real de la
  // tarjeta) para que al rotar no cambie de tamaño y no empuje el resto de
  // secciones hacia abajo — se recalcula si el ancho cambia (responsive).
  let lastWidth = 0;
  function lockHeight(): void {
    const width = body.clientWidth;
    if (width === 0 || width === lastWidth) return;
    lastWidth = width;

    const probe = body.cloneNode(true) as HTMLElement;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.minHeight = '0';
    probe.style.transform = 'none';
    probe.style.width = `${width}px`;
    document.body.appendChild(probe);
    const probeText = probe.querySelector('.quote-card__text') as HTMLElement;

    let max = 0;
    for (const q of QUOTES) {
      probeText.textContent = q.text;
      max = Math.max(max, probe.scrollHeight);
    }
    document.body.removeChild(probe);
    body.style.minHeight = `${max}px`;
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => lockHeight()).observe(body);
  } else {
    window.setTimeout(lockHeight, 0);
    window.addEventListener('resize', lockHeight);
  }

  window.setInterval(() => {
    // Sale la frase actual deslizándose hacia la izquierda mientras se desvanece.
    body.style.transition = `opacity ${OUT_MS}ms ${EASE_OUT}, transform ${OUT_MS}ms ${EASE_OUT}`;
    body.style.opacity = '0';
    body.style.transform = `translateX(-${SLIDE_PX}px)`;

    window.setTimeout(() => {
      pos = (pos + 1) % order.length;
      const q = QUOTES[order[pos]];
      textEl.textContent = q.text;
      authorEl.textContent = `— ${q.author}`;

      // La coloca lista a la derecha, sin transición, y luego la desliza a su
      // sitio ya animando con una desaceleración suave: efecto de carrusel.
      body.style.transition = 'none';
      body.style.transform = `translateX(${SLIDE_PX}px)`;
      void body.offsetWidth;
      body.style.transition = `opacity ${IN_MS}ms ${EASE_IN}, transform ${IN_MS}ms ${EASE_IN}`;
      body.style.opacity = '1';
      body.style.transform = 'translateX(0)';
    }, OUT_MS);
  }, ROTATE_MS);

  return card;
}
