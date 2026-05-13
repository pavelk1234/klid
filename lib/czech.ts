// All UI strings, in Czech. Imported by every component and email template.
// No fallback locale — Klid is Czech-only.

export const t = {
  // Brand
  appName: 'Klid',
  tagline: 'Meditace s ostatními',

  // Auth
  signIn: 'Přihlásit se',
  signUp: 'Vytvořit účet',
  signOut: 'Odhlásit se',
  email: 'E-mail',
  sendLink: 'Poslat odkaz',
  linkSent: 'Odkaz byl odeslán. Zkontroluj e-mail.',
  linkInvalid: 'Odkaz je neplatný nebo vypršel.',

  // Onboarding
  welcome: 'Vítej',
  yourName: 'Tvoje jméno',
  timezone: 'Časové pásmo',
  sessionLength: 'Délka meditace',
  frequency: 'Jak často',
  daily: 'Denně',
  weekly3: '3x týdně',
  weekly2: '2x týdně',
  weekly1: '1x týdně',
  save: 'Uložit',

  // Dashboard
  dashboard: 'Přehled',
  scheduleSession: 'Naplánovat sezení',
  upcomingSessions: 'Nadcházející sezení',
  pastSessions: 'Předchozí sezení',
  noUpcoming: 'Žádná naplánovaná sezení',
  noPast: 'Zatím žádná předchozí sezení',

  // Schedule
  date: 'Datum',
  time: 'Čas',
  length: 'Délka',
  partner: 'Partner',
  anyone: 'Kdokoliv',
  confirm: 'Potvrdit',
  cancel: 'Zrušit',
  noCandidates: 'Nikdo není v tu dobu dostupný. Zvol „Kdokoliv“ a počkáme.',
  pickPartner: 'Vyber partnera',
  back: 'Zpět',

  // Session
  join: 'Připojit se',
  start: 'Začít',
  sessionComplete: 'Sezení dokončeno',
  thankYou: 'Děkuji',
  leave: 'Odejít',
  end: 'Konec',
  endConfirm: 'Klepni znovu pro ukončení',
  chatPrompt: 'Pokud chceš, otevři si mikrofon a krátce si promluv s partnerem.',
  greeting: 'Pozdrav se. Za chvíli začínáme.',

  // Settings
  settings: 'Nastavení',
  halfwayBell: 'Zvon v polovině',
  halfwayBellHint: 'Jemný zvon zazní v polovině meditace.',
  availability: 'Dostupnost',
  availabilityHint: 'Označ, kdy během týdne jsi obvykle volný/á k meditaci.',
  saved: 'Uloženo',

  // Days
  days: ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'],
  daysLong: ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'],

  // Status labels
  statusOpen: 'Čeká na partnera',
  statusMatched: 'Spárováno',
  statusCompleted: 'Dokončeno',
  statusCancelled: 'Zrušeno',

  // Email — subjects + bodies (plain text, simple)
  emailReminderSubject: 'Připomínka: meditace za 15 minut',
  emailReminderBody: (joinUrl: string) =>
    `Tvoje sezení začíná za 15 minut. Připoj se zde: ${joinUrl}`,

  emailConfirmationSubject: 'Potvrzení: sezení zítra',
  emailConfirmationBody: (whenLocal: string, joinUrl: string) =>
    `Tvoje sezení proběhne ${whenLocal}. Připoj se zde: ${joinUrl}`,

  emailThanksSubject: 'Děkuji za sezení',
  emailThanksBody: 'Děkuji za sezení. Klid.',

  emailMatchedSubject: 'Máš partnera pro meditaci',
  emailMatchedBody: (whenLocal: string, joinUrl: string) =>
    `Někdo se přidal k tvému otevřenému sezení. Setkáte se ${whenLocal}. Odkaz: ${joinUrl}`,

  emailCancelledSubject: 'Sezení bylo zrušeno',
  emailCancelledBody: 'Nikdo se nepřidal k tvému otevřenému sezení. Zkus to znovu jindy.',

  emailMagicLinkSubject: 'Tvůj odkaz pro přihlášení do Klid',
  emailMagicLinkBody: (url: string) =>
    `Klikni pro přihlášení do Klid: ${url}\n\nOdkaz je platný 15 minut.`,

  // Misc
  loading: 'Načítám…',
  error: 'Něco se pokazilo.',
  notFound: 'Nenalezeno.',
  signInToContinue: 'Pro pokračování se přihlas.',
} as const

export const sessionLengths = [10, 20, 30, 45, 60] as const
export type SessionLength = (typeof sessionLengths)[number]

export const frequencies = [
  { value: 'daily', label: t.daily },
  { value: '3x', label: t.weekly3 },
  { value: '2x', label: t.weekly2 },
  { value: '1x', label: t.weekly1 },
] as const
export type Frequency = (typeof frequencies)[number]['value']
