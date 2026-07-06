// Tipos de dominio compartidos por toda la aplicación.

/** Un hábito tal como se guarda en la base de datos. */
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

/** Un registro de cumplimiento de un hábito en una fecha concreta. */
export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string; // formato ISO 'YYYY-MM-DD'
  completed: boolean;
  created_at: string;
}

/** Mapa de cumplimientos en memoria: clave `${habit_id}|${YYYY-MM-DD}` -> completado. */
export type CompletionMap = Map<string, boolean>;

/** Plazo de una meta. */
export type GoalTerm = 'short' | 'medium' | 'long';

/** Una meta (corto, mediano o largo plazo) tal como se guarda en la base de datos. */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  term: GoalTerm;
  target_date: string | null; // formato ISO 'YYYY-MM-DD'
  completed: boolean;
  created_at: string;
}
