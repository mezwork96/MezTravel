// Consignes communes : Claude se comporte en conseiller de voyage. Il interroge,
// discute, puis ne donne le résultat à importer qu'après confirmation.

export type Topic = 'route' | 'days'

const texts = {
  it: {
    role: 'Fai il mio consulente di viaggio: voglio costruire la soluzione insieme a te, in conversazione.',
    questions: 'Come lavorare:',
    one: '1. Fammi UNA sola domanda per messaggio e aspetta la mia risposta. Non chiedere quello che ti ho già scritto qui.',
    first: {
      route: '2. La prima domanda è: «Hai già un’idea del percorso che vorresti fare?»',
      routeWithIdea: '2. Ho già un’idea (scritta qui sopra): parti da quella.',
      days: '2. Per prima cosa chiedimi se ho già in mente qualcosa per questi giorni.',
    },
    idea: '3. Se ho un’idea, dimmi con sincerità cosa funziona, cosa cambieresti e perché, e costruiamo insieme la soluzione: decido io. Se non ce l’ho, parti dai miei desideri.',
    specific: '4. Poi fai domande specifiche, basate sui miei interessi e sulle mie risposte, solo quelle che cambiano davvero i consigli (di solito da 3 a 7). Se scrivo «proponi subito», smetti di fare domande.',
    discuss: '5. Quindi presenta la proposta che consigli, in modo leggibile, spiegando le scelte e i compromessi (alternative solo se utili). Chiedimi cosa cambiare e continua finché non sono soddisfatto.',
    confirm: '6. Durante la conversazione non scrivere codice. Solo quando scrivo «confermo», prepara il risultato finale e dimmi di copiarlo e incollarlo in MezTravel.',
    idLabel: 'La mia idea di percorso',
  },
  en: {
    role: 'Be my travel consultant: I want to build the solution together with you, in a conversation.',
    questions: 'How to work:',
    one: '1. Ask me only ONE question per message and wait for my answer. Do not ask what I have already told you here.',
    first: {
      route: '2. Your first question is: “Do you already have an idea of the route you would like?”',
      routeWithIdea: '2. I already have an idea (written above): start from it.',
      days: '2. First ask me whether I already have something in mind for these days.',
    },
    idea: '3. If I have an idea, tell me honestly what works, what you would change and why, and let us build the solution together: I decide. If I have none, start from my wishes.',
    specific: '4. Then ask specific questions, based on my interests and answers, only those that really change your advice (usually 3 to 7). If I write “suggest now”, stop asking.',
    discuss: '5. Then present the proposal you recommend in a readable way, explaining choices and trade-offs (alternatives only if useful). Ask what to change and continue until I am happy.',
    confirm: '6. Do not write code during the conversation. Only when I write “I confirm”, prepare the final result and tell me to copy and paste it into MezTravel.',
    idLabel: 'My route idea',
  },
  fr: {
    role: 'Sois mon conseiller de voyage : je veux construire la solution avec toi, en discutant.',
    questions: 'Façon de travailler :',
    one: '1. Pose-moi UNE seule question par message et attends ma réponse. Ne redemande pas ce que je t’ai déjà écrit ici.',
    first: {
      route: '2. Ta première question est : « Avez-vous déjà une idée du parcours que vous voudriez faire ? »',
      routeWithIdea: '2. J’ai déjà une idée (écrite plus haut) : pars de là.',
      days: '2. Demande-moi d’abord si j’ai déjà quelque chose en tête pour ces jours.',
    },
    idea: '3. Si j’ai une idée, dis-moi franchement ce qui marche, ce que tu changerais et pourquoi, et construisons la solution ensemble : c’est moi qui décide. Sinon, pars de mes envies.',
    specific: '4. Pose ensuite des questions précises, selon mes envies et mes réponses, seulement celles qui changent vraiment tes conseils (en général 3 à 7). Si j’écris « propose maintenant », arrête les questions.',
    discuss: '5. Présente alors la proposition que tu recommandes, de façon lisible, en expliquant les choix et les compromis (des variantes seulement si utile). Demande-moi quoi changer et continue jusqu’à ce que je sois satisfait.',
    confirm: '6. N’écris pas de code pendant la discussion. Seulement quand j’écris « je confirme », prépare le résultat final et dis-moi de le copier et de le coller dans MezTravel.',
    idLabel: 'Mon idée de parcours',
  },
}

export type ConsultantLanguage = keyof typeof texts

export const ideaLabel = (language: ConsultantLanguage) => texts[language].idLabel

export function consultantRules(language: ConsultantLanguage, topic: Topic, hasIdea = false): string[] {
  const s = texts[language]
  const first = topic === 'days' ? s.first.days : hasIdea ? s.first.routeWithIdea : s.first.route
  return [s.role, '', s.questions, s.one, first, s.idea, s.specific, s.discuss, s.confirm]
}
