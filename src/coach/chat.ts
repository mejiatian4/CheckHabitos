import { el, clear } from '../ui/dom';
import { icons } from '../ui/icons';
import { errorMessage } from '../ui/toast';
import { sendCoachMessage } from './api';
import type { ChatMessage } from '../lib/types';

const WELCOME =
  'Hola, soy tu coach de KROTON HABITOS. Cuéntame cómo vas con tus hábitos o pregúntame algo sobre disciplina, constancia o tus metas.';

const SUGGESTIONS = [
  '¿Cómo voy esta semana?',
  'Ayúdame a no romper mi racha',
  'Dame un consejo para hoy',
  'Ayúdame a definir una meta',
];

/** Pinta el chat con el coach de IA. Se monta una sola vez por sesión (lazy). */
export function renderCoachChat(root: HTMLElement): void {
  clear(root);

  // Historial en memoria: se manda al backend para que el coach tenga contexto
  // de la conversación, pero no se guarda en la base de datos.
  const history: ChatMessage[] = [];

  const messages = el('div', { class: 'chat__messages', role: 'log', 'aria-live': 'polite' });

  const input = el('textarea', {
    class: 'chat__input',
    placeholder: 'Escríbele al coach…',
    rows: 1,
  });
  const sendBtn = el(
    'button',
    { class: 'btn btn--primary chat__send', type: 'submit', 'aria-label': 'Enviar mensaje' },
    [icons.send()],
  );

  const suggestions = el(
    'div',
    { class: 'chat__suggestions' },
    SUGGESTIONS.map((text) => {
      const chip = el('button', { class: 'chat__chip', type: 'button' }, [text]);
      chip.addEventListener('click', () => {
        input.value = text;
        void onSend();
      });
      return chip;
    }),
  );

  const form = el('form', { class: 'chat__composer' }, [input, sendBtn]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void onSend();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  });
  input.addEventListener('input', () => autoGrow());

  const card = el('section', { class: 'card card--chat' }, [
    el('div', { class: 'card__head' }, [
      el('h2', { class: 'card__title' }, ['Coach']),
    ]),
    messages,
    suggestions,
    form,
  ]);

  root.append(card);
  appendMessage('assistant', WELCOME);
  input.focus();

  function autoGrow(): void {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function appendMessage(role: ChatMessage['role'], text: string): HTMLElement {
    const bubble = el('div', { class: `chat__bubble chat__bubble--${role}` }, [text]);
    const row = el('div', { class: `chat__row chat__row--${role}` }, [bubble]);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function appendTyping(): HTMLElement {
    const bubble = el('div', { class: 'chat__bubble chat__bubble--assistant chat__bubble--typing' }, [
      el('span', { class: 'chat__dot' }),
      el('span', { class: 'chat__dot' }),
      el('span', { class: 'chat__dot' }),
    ]);
    const row = el('div', { class: 'chat__row chat__row--assistant' }, [bubble]);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  async function onSend(): Promise<void> {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    autoGrow();
    input.setAttribute('disabled', 'true');
    sendBtn.setAttribute('disabled', 'true');
    suggestions.style.display = 'none';

    appendMessage('user', text);
    history.push({ role: 'user', text });

    const typingRow = appendTyping();

    try {
      const reply = await sendCoachMessage(text, history);
      typingRow.remove();
      appendMessage('assistant', reply);
      history.push({ role: 'assistant', text: reply });
    } catch (err) {
      typingRow.remove();
      appendMessage('assistant', errorMessage(err, 'No pude responder. Intenta de nuevo.'));
    } finally {
      input.removeAttribute('disabled');
      sendBtn.removeAttribute('disabled');
      input.focus();
    }
  }
}
