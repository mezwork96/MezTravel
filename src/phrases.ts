// Phrases courantes de voyage, incluses dans l'app : elles fonctionnent sans internet
// et évitent les réponses fausses du service en ligne sur les phrases très courtes.
// Japonais poli courant, rédigé pour le projet, non relu par une personne de langue
// maternelle.
import type { Localized } from './guide/types.ts'

export const phraseLanguages = ['it', 'en', 'fr', 'ja'] as const
export type Phrase = Record<(typeof phraseLanguages)[number], string>

type Row = [string, string, string, string]
type Group = Localized & { icon: string; rows: Row[] }

const groups: Group[] = [
  {
    icon: '👋', it: 'Saluti e base', en: 'Greetings and basics', fr: 'Salutations et bases',
    rows: [
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
      ['Per favore', 'Please', 'S’il vous plaît', 'お願いします'],
      ['Piacere di conoscerla', 'Nice to meet you', 'Enchanté', 'はじめまして'],
      ['Non capisco', 'I don’t understand', 'Je ne comprends pas', 'わかりません'],
      ['Non parlo giapponese', 'I don’t speak Japanese', 'Je ne parle pas japonais', '日本語が話せません'],
      ['Parla inglese?', 'Do you speak English?', 'Parlez-vous anglais ?', '英語は話せますか？'],
      ['Può ripetere lentamente, per favore?', 'Could you repeat slowly, please?', 'Pouvez-vous répéter lentement, s’il vous plaît ?', 'もう一度ゆっくりお願いします。'],
      ['Può scriverlo?', 'Could you write it down?', 'Pouvez-vous l’écrire ?', '書いていただけますか？'],
      ['Vengo dall’Italia', 'I come from Italy', 'Je viens d’Italie', 'イタリアから来ました。'],
      ['Vengo dalla Svizzera', 'I come from Switzerland', 'Je viens de Suisse', 'スイスから来ました。'],
    ],
  },
  {
    icon: '🚆', it: 'Treni e strade', en: 'Trains and directions', fr: 'Trains et directions',
    rows: [
      ['Dov’è la stazione?', 'Where is the station?', 'Où est la gare ?', '駅はどこですか？'],
      ['Vorrei andare qui', 'I would like to go here', 'Je voudrais aller ici', 'ここに行きたいです。'],
      ['Questo treno va a questa stazione?', 'Does this train go to this station?', 'Ce train va-t-il à cette gare ?', 'この電車はこの駅に行きますか？'],
      ['Da quale binario parte?', 'Which platform does it leave from?', 'De quel quai part-il ?', '何番線から出ますか？'],
      ['A che ora parte?', 'What time does it leave?', 'À quelle heure part-il ?', '何時に出発しますか？'],
      ['Devo cambiare treno?', 'Do I have to change trains?', 'Dois-je changer de train ?', '乗り換えが必要ですか？'],
      ['Dove si comprano i biglietti?', 'Where can I buy tickets?', 'Où acheter les billets ?', '切符はどこで買えますか？'],
      ['Dov’è la fermata dell’autobus?', 'Where is the bus stop?', 'Où est l’arrêt de bus ?', 'バス停はどこですか？'],
      ['Dov’è il bagno?', 'Where is the toilet?', 'Où sont les toilettes ?', 'トイレはどこですか？'],
      ['Dov’è l’uscita?', 'Where is the exit?', 'Où est la sortie ?', '出口はどこですか？'],
      ['Può mostrarmelo sulla mappa?', 'Could you show me on the map?', 'Pouvez-vous me le montrer sur la carte ?', '地図で教えていただけますか？'],
      ['A questo indirizzo, per favore', 'To this address, please', 'À cette adresse, s’il vous plaît', 'この住所までお願いします。'],
      ['Mi sono perso', 'I’m lost', 'Je me suis perdu', '道に迷いました。'],
    ],
  },
  {
    icon: '🍜', it: 'Al ristorante', en: 'At the restaurant', fr: 'Au restaurant',
    rows: [
      ['Un tavolo per due, per favore', 'A table for two, please', 'Une table pour deux, s’il vous plaît', '二人です。'],
      ['Ha un menu in inglese?', 'Do you have an English menu?', 'Avez-vous un menu en anglais ?', '英語のメニューはありますか？'],
      ['Cosa mi consiglia?', 'What do you recommend?', 'Que me conseillez-vous ?', 'おすすめは何ですか？'],
      ['Questo, per favore', 'This one, please', 'Ceci, s’il vous plaît', 'これをお願いします。'],
      ['Acqua, per favore', 'Water, please', 'De l’eau, s’il vous plaît', 'お水をお願いします。'],
      ['Buonissimo', 'Delicious', 'Délicieux', 'おいしいです。'],
      ['Il conto, per favore', 'The bill, please', 'L’addition, s’il vous plaît', 'お会計をお願いします。'],
      ['Sono vegetariano', 'I am vegetarian', 'Je suis végétarien', '私はベジタリアンです。'],
      ['Non mangio carne', 'I don’t eat meat', 'Je ne mange pas de viande', '肉は食べません。'],
      ['C’è carne di maiale?', 'Does it contain pork?', 'Y a-t-il du porc ?', '豚肉は入っていますか？'],
      ['Senza alcol, per favore', 'No alcohol, please', 'Sans alcool, s’il vous plaît', 'アルコールなしでお願いします。'],
    ],
  },
  {
    icon: '🏨', it: 'In albergo', en: 'At the hotel', fr: 'À l’hôtel',
    rows: [
      ['Ho una prenotazione', 'I have a reservation', 'J’ai une réservation', '予約しています。'],
      ['Vorrei fare il check-in', 'I would like to check in', 'Je voudrais m’enregistrer', 'チェックインをお願いします。'],
      ['A che ora è il check-out?', 'What time is check-out?', 'À quelle heure faut-il libérer la chambre ?', 'チェックアウトは何時ですか？'],
      ['Posso lasciare qui i bagagli?', 'May I leave my luggage here?', 'Puis-je laisser mes bagages ici ?', '荷物を預かってもらえますか？'],
      ['C’è il Wi-Fi?', 'Is there Wi-Fi?', 'Y a-t-il le Wi-Fi ?', 'Wi-Fiはありますか？'],
      ['La chiave non funziona', 'The key does not work', 'La clé ne fonctionne pas', '鍵が使えません。'],
    ],
  },
  {
    icon: '🛍️', it: 'Acquisti e visite', en: 'Shopping and visits', fr: 'Achats et visites',
    rows: [
      ['Quanto costa?', 'How much is it?', 'Combien ça coûte ?', 'いくらですか？'],
      ['Posso pagare con la carta?', 'Can I pay by card?', 'Puis-je payer par carte ?', 'カードで払えますか？'],
      ['Posso provarlo?', 'May I try it on?', 'Puis-je l’essayer ?', '試着してもいいですか？'],
      ['C’è una taglia più grande?', 'Do you have a larger size?', 'Avez-vous une taille au-dessus ?', 'もっと大きいサイズはありますか？'],
      ['Vorrei fare il tax free', 'I would like to shop tax free', 'Je voudrais la détaxe', '免税をお願いします。'],
      ['Posso fare una foto?', 'May I take a photo?', 'Puis-je prendre une photo ?', '写真を撮ってもいいですか？'],
      ['Può farci una foto?', 'Could you take a photo of us?', 'Pouvez-vous nous prendre en photo ?', '写真を撮っていただけますか？'],
      ['Dov’è l’ingresso?', 'Where is the entrance?', 'Où est l’entrée ?', '入口はどこですか？'],
      ['Serve la prenotazione?', 'Do I need a reservation?', 'Faut-il réserver ?', '予約は必要ですか？'],
      ['Ho un tatuaggio, posso entrare?', 'I have a tattoo, may I come in?', 'J’ai un tatouage, puis-je entrer ?', 'タトゥーがありますが、入れますか？'],
    ],
  },
  {
    icon: '🐴', it: 'Cavalli e maneggio', en: 'Horses and riding', fr: 'Chevaux et équitation',
    rows: [
      ['Sono un cavaliere professionista di salto ostacoli', 'I am a professional show-jumping rider', 'Je suis cavalier professionnel de saut d’obstacles', '私は障害馬術のプロの選手です。'],
      ['Ho esperienza di equitazione', 'I have riding experience', 'J’ai de l’expérience à cheval', '乗馬の経験があります。'],
      ['Sono un principiante a cavallo', 'I am a beginner rider', 'Je débute à cheval', '乗馬は初心者です。'],
      ['Dov’è il maneggio?', 'Where is the riding club?', 'Où est le centre équestre ?', '乗馬クラブはどこですか？'],
      ['Si può visitare la scuderia?', 'May we visit the stables?', 'Peut-on visiter l’écurie ?', '厩舎を見学できますか？'],
      ['Posso accarezzare il cavallo?', 'May I stroke the horse?', 'Puis-je caresser le cheval ?', '馬に触ってもいいですか？'],
      ['Posso montare a cavallo?', 'May I ride?', 'Puis-je monter à cheval ?', '馬に乗れますか？'],
      ['Posso saltare gli ostacoli?', 'May I jump fences?', 'Puis-je sauter des obstacles ?', '障害を跳んでもいいですか？'],
      ['Come si chiama questo cavallo?', 'What is this horse’s name?', 'Comment s’appelle ce cheval ?', 'この馬の名前は何ですか？'],
      ['Quanti anni ha questo cavallo?', 'How old is this horse?', 'Quel âge a ce cheval ?', 'この馬は何歳ですか？'],
      ['È un cavallo tranquillo?', 'Is this a calm horse?', 'Est-ce un cheval calme ?', 'おとなしい馬ですか？'],
      ['Posso noleggiare un casco?', 'Can I rent a helmet?', 'Puis-je louer un casque ?', 'ヘルメットを借りられますか？'],
      ['Posso noleggiare gli stivali?', 'Can I rent boots?', 'Puis-je louer des bottes ?', 'ブーツを借りられますか？'],
      ['Quando c’è il prossimo concorso?', 'When is the next competition?', 'Quand a lieu le prochain concours ?', '次の競技会はいつですか？'],
    ],
  },
  {
    icon: '💊', it: 'Salute', en: 'Health', fr: 'Santé',
    rows: [
      ['Non mi sento bene', 'I don’t feel well', 'Je ne me sens pas bien', '体調が悪いです。'],
      ['Mi fa male qui', 'It hurts here', 'J’ai mal ici', 'ここが痛いです。'],
      ['Ho la febbre', 'I have a fever', 'J’ai de la fièvre', '熱があります。'],
      ['Dov’è una farmacia?', 'Where is a pharmacy?', 'Où y a-t-il une pharmacie ?', '薬局はどこですか？'],
      ['Dov’è l’ospedale?', 'Where is the hospital?', 'Où est l’hôpital ?', '病院はどこですか？'],
      ['Ho un’allergia alimentare', 'I have a food allergy', 'J’ai une allergie alimentaire', '食物アレルギーがあります。'],
      ['Sono caduto', 'I had a fall', 'Je suis tombé', '転びました。'],
      ['Sono caduto da cavallo', 'I fell off a horse', 'Je suis tombé de cheval', '馬から落ちました。'],
      ['Ho un’assicurazione', 'I have insurance', 'J’ai une assurance', '保険に入っています。'],
    ],
  },
  {
    icon: '🆘', it: 'Emergenze', en: 'Emergencies', fr: 'Urgences',
    rows: [
      ['Aiuto!', 'Help!', 'Au secours !', '助けてください！'],
      ['Chiami un’ambulanza, per favore', 'Please call an ambulance', 'Appelez une ambulance, s’il vous plaît', '救急車を呼んでください。'],
      ['Chiami la polizia, per favore', 'Please call the police', 'Appelez la police, s’il vous plaît', '警察を呼んでください。'],
      ['C’è un incendio!', 'There is a fire!', 'Au feu !', '火事です！'],
      ['Ho perso il passaporto', 'I have lost my passport', 'J’ai perdu mon passeport', 'パスポートをなくしました。'],
      ['Ho perso il portafoglio', 'I have lost my wallet', 'J’ai perdu mon portefeuille', '財布をなくしました。'],
      ['Dov’è la polizia?', 'Where is the police?', 'Où est la police ?', '交番はどこですか？'],
    ],
  },
]

const toPhrase = ([it, en, fr, ja]: Row): Phrase => ({ it, en, fr, ja })

export const phraseGroups = groups.map(({ rows, ...group }) => ({
  ...group,
  phrases: rows.map(toPhrase),
}))

export const phrases: Phrase[] = phraseGroups.flatMap((group) => group.phrases)

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
