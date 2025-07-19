export const DeckInfo = [
    {id: 'hsk1-v2.0', title: 'HSK 1', subtitle: '(v2.0)'},
    {id: 'hsk2-v2.0', title: 'HSK 2', subtitle: '(v2.0)'},
    {id: 'hsk3-v2.0', title: 'HSK 3', subtitle: '(v2.0)'},
    {id: 'hsk4-v2.0', title: 'HSK 4', subtitle: '(v2.0)'},
    {id: 'hsk5-v2.0', title: 'HSK 5', subtitle: '(v2.0)'},
    {id: 'hsk6-v2.0', title: 'HSK 6', subtitle: '(v2.0)'},
    {id: 'hsk1-v3.0', title: 'HSK 1', subtitle: '(v3.0)'},
    {id: 'hsk2-v3.0', title: 'HSK 2', subtitle: '(v3.0)'},
    {id: 'hsk3-v3.0', title: 'HSK 3', subtitle: '(v3.0)'},
    {id: 'hsk4-v3.0', title: 'HSK 4', subtitle: '(v3.0)'},
    {id: 'hsk5-v3.0', title: 'HSK 5', subtitle: '(v3.0)'},
    {id: 'hsk6-v3.0', title: 'HSK 6', subtitle: '(v3.0)'},
    {id: 'hsk7-v3.0', title: 'HSK 7', subtitle: '(v3.0)'},
]

export const ChineseToneColorPalette = {
    Default: ['#3E92CC', '#419E6F', '#7C3AED', '#DB6B6C', '#555555'],
    "Tofu Like": ['#DB6B6C','#419E6F', '#3E92CC', '#7C3AED', '#555555'],
}

export const CHINESE_WORLISTS_SRC = [
    '/assets/wordlist/complete-hsk-vocabulary/old/1.json',
    '/assets/wordlist/complete-hsk-vocabulary/old/2.json',
    '/assets/wordlist/complete-hsk-vocabulary/old/3.json',
    '/assets/wordlist/complete-hsk-vocabulary/old/4.json',
    '/assets/wordlist/complete-hsk-vocabulary/old/5.json',
    '/assets/wordlist/complete-hsk-vocabulary/old/6.json',
]

export const DEFAULT_FSRS_PARAM =  [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542, 
]

export const SETTINGS_LABEL_DATA = {
  newCardPerDay: {
    label: "New Card Per Day",
    help: "Specifies the number of new cards to learn each day.",
  },
  maxReviewsPerDay: {
    label: "Max Reviews Per Day",
    help: "Specifies the maximum number of cards to review each day.",
  },
  newCardOrder: {
    label: "New Card Order",
    help: "Determines the sequence in which new cards are introduced.",
  },
  newPreviouslyStudiedCardPerDay: {
    label: "New Previously Studied Card Per Day",
    help: "Specifies the number of cards per day drawn from the \"Previously Studied\" pool.",
  },
  newPreviouslyStudiedCardOrder: {
    label: "New Previously Studied Card Order",
    help: "Determines the sequence in which cards from the \"Previously Studied\" pool are presented.",
  },

  learningSteps: {
    label: "Learning Steps",
    help: "TODO",
  },
  previouslyStudiedLearningSteps: {
    label: "Previously Studied Learning Steps",
    help: "TODO",
  },
  desiredRetention: {
    label: "Desired Retention",
    help: "Defines the target probability of successful recall. Higher values increase review frequency (recommended range: 0.8–0.9).",
  },
  enableShortTerm: {
    label: "Enable Short Term",
    help: "When disabled, the short-term review schedule is bypassed.",
  },
  enableFuzz: {
    label: "Enable Fuzz",
    help: "When enabled, introduces slight random variation to intervals to prevent reviews from clustering on the same day.",
  },
  FSRSParams: {
    label: "FSRS Params",
    help: "Specifies advanced parameters for the FSRS review algorithm.",
  },

  zhIsColorBasedOnTone: {
    label: "Color The Characters Based On Their Tone",
    help: "When enabled, assigns a distinct color to each Chinese tone to facilitate recognition.",
  },
  zhToneColors: {
    label: "Tone Colors",
    help: "Specifies the colors used for each Chinese tone.",
  },
  zhTone1: { label: "Tone 1", help: "" },
  zhTone2: { label: "Tone 2", help: "" },
  zhTone3: { label: "Tone 3", help: "" },
  zhTone4: { label: "Tone 4", help: "" },
  zhToneNeutral: { label: "Neutral", help: "" },
}