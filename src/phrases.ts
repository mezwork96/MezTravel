// Phrases courantes de voyage, incluses dans l'app : elles fonctionnent sans internet
// et évitent les réponses fausses du service en ligne sur les phrases très courtes.
// Japonais poli courant, rédigé pour le projet, non relu par une personne de langue
// maternelle.

export const phraseLanguages = ['it', 'en', 'fr', 'ja'] as const
export type Phrase = Record<(typeof phraseLanguages)[number], string>

const rows: [string, string, string, string][] = [
  ['Buongiorno', 'Hello', 'Bonjour', 'こんにちは'],
  ['Buonasera', 'Good evening', 'Bonsoir', 'こんばんは'],
  ['Arrivederci', 'Goodbye', 'Au revoir', 'さようなら'],
  ['Grazie', 'Thank you', 'Merci', 'ありがとうございます'],
  ['Grazie mille', 'Thank you very much', 'Merci beaucoup', 'どうもありがとうございます'],
  ['Prego', 'You’re welcome', 'De rien', 'どういたしまして'],
  ['Mi scusi', 'Excuse me', 'Excusez-moi', 'すみません'],
  ['Mi dispiace', 'I’m sorry', 'Je suis désolé', 'ごめんなさい'],
  ['Sì', 'Yes', 'Oui', 'はい'],
  ['No', 'No', 'Non', 'いいえ'],
  ['Non capisco', 'I don’t understand', 'Je ne comprends pas', 'わかりません'],
  ['Non parlo giapponese', 'I don’t speak Japanese', 'Je ne parle pas japonais', '日本語が話せません'],
  ['Parla inglese?', 'Do you speak English?', 'Parlez-vous anglais ?', '英語は話せますか？'],
  ['Può ripetere lentamente, per favore?', 'Could you repeat slowly, please?', 'Pouvez-vous répéter lentement, s’il vous plaît ?', 'もう一度ゆっくりお願いします。'],
  ['Dov’è il bagno?', 'Where is the toilet?', 'Où sont les toilettes ?', 'トイレはどこですか？'],
  ['Dov’è la stazione?', 'Where is the station?', 'Où est la gare ?', '駅はどこですか？'],
  ['Vorrei andare qui', 'I would like to go here', 'Je voudrais aller ici', 'ここに行きたいです。'],
  ['Quanto costa?', 'How much is it?', 'Combien ça coûte ?', 'いくらですか？'],
  ['Il conto, per favore', 'The bill, please', 'L’addition, s’il vous plaît', 'お会計をお願いします。'],
  ['Posso pagare con la carta?', 'Can I pay by card?', 'Puis-je payer par carte ?', 'カードで払えますか？'],
  ['Acqua, per favore', 'Water, please', 'De l’eau, s’il vous plaît', 'お水をお願いします。'],
  ['Questo, per favore', 'This one, please', 'Ceci, s’il vous plaît', 'これをお願いします。'],
  ['Ho un’allergia alimentare', 'I have a food allergy', 'J’ai une allergie alimentaire', '食物アレルギーがあります。'],
  ['Posso fare una foto?', 'May I take a photo?', 'Puis-je prendre une photo ?', '写真を撮ってもいいですか？'],
  ['Ho una prenotazione', 'I have a reservation', 'J’ai une réservation', '予約しています。'],
  ['Mi sono perso', 'I’m lost', 'Je me suis perdu', '道に迷いました。'],
  ['Aiuto!', 'Help!', 'Au secours !', '助けてください！'],
  ['Chiami un’ambulanza, per favore', 'Please call an ambulance', 'Appelez une ambulance, s’il vous plaît', '救急車を呼んでください。'],
]

export const phrases: Phrase[] = rows.map(([it, en, fr, ja]) => ({ it, en, fr, ja }))

// Majuscules, ponctuation, accents et sorte d'apostrophe ne comptent pas.
const simple = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[.,!?;:。、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function knownPhrase(text: string, from: string, to: string): string | undefined {
  const known = (code: string): code is keyof Phrase =>
    (phraseLanguages as readonly string[]).includes(code)
  if (!known(from) || !known(to) || from === to) return undefined
  const wanted = simple(text)
  if (!wanted) return undefined
  return phrases.find((p) => simple(p[from]) === wanted)?.[to]
}
