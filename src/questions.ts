// Questions précises pour mieux connaître les envies et organiser les journées.
// Chaque réponse change réellement l'itinéraire créé par l'app (voir planner.ts).
// Toutes sont facultatives. Les identifiants sont enregistrés dans les voyages.
import type { Localized } from './guide/types.ts'

type Option = { id: string } & Localized
export type Question = { id: string; ask: Localized; options: Option[]; perDay?: boolean; needs?: string }

const option = (id: string, it: string, en: string, fr: string): Option => ({ id, it, en, fr })
const yes = option('yes', 'Sì', 'Yes', 'Oui')
const no = option('no', 'No', 'No', 'Non')

export const questions: Question[] = [
  {
    id: 'classics',
    ask: { it: 'Cosa preferisci vedere?', en: 'What do you prefer to see?', fr: 'Que préférez-vous voir ?' },
    options: [
      option('first', 'Prima i luoghi imperdibili', 'The must-sees first', 'D’abord les incontournables'),
      option('quiet', 'Anche posti meno noti', 'Lesser-known places too', 'Aussi des lieux moins connus'),
    ],
  },
  {
    id: 'start',
    perDay: true,
    ask: { it: 'A che ora vuoi iniziare la giornata?', en: 'When do you want to start the day?', fr: 'À quelle heure commencer la journée ?' },
    options: [
      option('early', 'Presto (8:00)', 'Early (8:00)', 'Tôt (8 h)'),
      option('normal', 'Con calma (9:30)', 'Relaxed (9:30)', 'Tranquillement (9 h 30)'),
      option('late', 'Tardi (11:00)', 'Late (11:00)', 'Tard (11 h)'),
    ],
  },
  {
    id: 'evening',
    perDay: true,
    ask: { it: 'E la sera?', en: 'And in the evening?', fr: 'Et le soir ?' },
    options: [
      option('often', 'Mi piace uscire', 'I like going out', 'J’aime sortir'),
      option('sometimes', 'Ogni tanto', 'Sometimes', 'De temps en temps'),
      option('never', 'Preferisco riposare', 'I prefer to rest', 'Je préfère me reposer'),
    ],
  },
  {
    id: 'lunch',
    ask: {
      it: 'Vuoi che a pranzo ti proponga un posto dove mangiare (se la guida ne ha uno)?',
      en: 'Should I suggest a place to eat at lunch (when the guide has one)?',
      fr: 'Faut-il proposer un endroit pour déjeuner (si le guide en a un) ?',
    },
    options: [yes, no],
  },
  {
    id: 'walking',
    ask: { it: 'Quanto vuoi camminare?', en: 'How much do you want to walk?', fr: 'Voulez-vous beaucoup marcher ?' },
    options: [
      option('little', 'Poco: niente escursioni, posti vicini', 'Little: no hikes, places close together', 'Peu : pas de randonnée, lieux proches'),
      option('normal', 'Senza problemi', 'No problem', 'Sans problème'),
    ],
  },
  {
    id: 'hike',
    needs: 'hiking',
    ask: { it: 'Che escursioni vuoi fare?', en: 'Which hikes do you want?', fr: 'Quelles randonnées voulez-vous ?' },
    options: [
      option('easy', 'Brevi (fino a 4 ore)', 'Short (up to 4 hours)', 'Courtes (jusqu’à 4 h)'),
      option('any', 'Anche lunghe', 'Long ones too', 'Aussi les longues'),
    ],
  },
  {
    id: 'children',
    ask: { it: 'Viaggiano bambini?', en: 'Are children travelling?', fr: 'Des enfants voyagent-ils ?' },
    options: [yes, no],
  },
  {
    id: 'outings',
    ask: {
      it: 'Vuoi gite in giornata fuori dalla città dove dormi?',
      en: 'Do you want day trips from the city where you sleep?',
      fr: 'Voulez-vous des excursions à la journée depuis votre ville ?',
    },
    options: [yes, no],
  },
]

export const startTimes: Record<string, number> = { early: 8 * 60, normal: 9 * 60 + 30, late: 11 * 60 }

export type Answers = Record<string, string>

export function isAnswers(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.entries(value).every(([key, answer]) =>
    questions.some((q) => q.id === key && q.options.some((o) => o.id === answer)),
  )
}

// Toucher de nouveau la réponse choisie la retire.
export function answered(answers: Answers, question: string, option: string): Answers {
  const next = { ...answers }
  if (next[question] === option) delete next[question]
  else next[question] = option
  return next
}
