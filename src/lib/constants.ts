import { base } from "$app/paths";

export enum DECK_TAGS {
    ZH_TRAD = "ZH_TRAD",
    ZH_YUE = "ZH_YUE",
    ZH_EXTRA_DICT = "ZH_EXTRA_DICT",
}

export const MainDeckInfo = [
    // {id: 'test', title: 'Test', subtitle: '', src: 'test.txt'},
    {id: 'hsk1-v2.0', title: 'HSK 1', subtitle: '(v2.0)', src: 'hsk1-v2.0.txt'},
    {id: 'hsk2-v2.0', title: 'HSK 2', subtitle: '(v2.0)', src: 'hsk2-v2.0.txt'},
    {id: 'hsk3-v2.0', title: 'HSK 3', subtitle: '(v2.0)', src: 'hsk3-v2.0.txt'},
    {id: 'hsk4-v2.0', title: 'HSK 4', subtitle: '(v2.0)', src: 'hsk4-v2.0.txt'},
    {id: 'hsk5-v2.0', title: 'HSK 5', subtitle: '(v2.0)', src: 'hsk5-v2.0.txt'},
    {id: 'hsk6-v2.0', title: 'HSK 6', subtitle: '(v2.0)', src: 'hsk6-v2.0.txt'},
    {id: 'hsk1-v3.0', title: 'HSK 1', subtitle: '(v3.0)', src: 'hsk1-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk2-v3.0', title: 'HSK 2', subtitle: '(v3.0)', src: 'hsk2-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk3-v3.0', title: 'HSK 3', subtitle: '(v3.0)', src: 'hsk3-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk4-v3.0', title: 'HSK 4', subtitle: '(v3.0)', src: 'hsk4-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk5-v3.0', title: 'HSK 5', subtitle: '(v3.0)', src: 'hsk5-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk6-v3.0', title: 'HSK 6', subtitle: '(v3.0)', src: 'hsk6-v3.0.txt', color: '#3E92CC'},
    {id: 'hsk7-v3.0', title: 'HSK 7', subtitle: '(v3.0)', src: 'hsk7-v3.0.txt', color: '#3E92CC'},
]

export const DeckFilters = [
    "Simplified",
    "Traditional",
    "Cantonese"
]

export const DeckInfo: {
    id: string,
    title: string,
    subtitle: string,
    src?: string,
    color?: string,
    tags?: DECK_TAGS[],
}[] = [
    // Simplified
    // {subtitle: '(v#.0) - Simplified'},
    ...MainDeckInfo.map(d => ({
        ...d,
        subtitle: d.subtitle + ' - Simplified',
        tags: [] as DECK_TAGS[]
    })),
    // Traditional
    // {id: 'hsk#-v#.0-trad', subtitle: '(v#.0) - Traditional'},
    ...MainDeckInfo.map(d => ({
        ...d,
        id: d.id + '-trad',
        subtitle: d.subtitle + ' - Traditional',
        tags: [DECK_TAGS.ZH_TRAD],
    })),
    // Cantonese
    // {id: 'hsk#-v#.0-yue', subtitle: '(v#.0) - Cantonese'},
    ...MainDeckInfo.map(d => ({
        ...d,
        id: d.id + '-yue',
        subtitle: d.subtitle + ' - Cantonese',
        tags: [DECK_TAGS.ZH_YUE, DECK_TAGS.ZH_TRAD],
    })),
]

export const CHARACTER_WRITER_DRAWING_WIDTH = 20;

export const ChineseToneColorPalette = {
    Default: ['#3E92CC', '#419E6F', '#7C3AED', '#DB6B6C', '#555555'],
    "Tofu Like": ['#DB6B6C','#419E6F', '#3E92CC', '#7C3AED', '#555555'],
}

export const CHINESE_DICT_SRC = `${base}/wenbun-assets/zh/zh_dict.json`;
export const CHINESE_CC_CEDICT_SRC = `${base}/wenbun-assets/zh/zh_cc_cedict_array.json`;
export const CHINESE_MAKEMEAHANZI_SRC = `${base}/wenbun-assets/zh/zh_makemeahanzi.jsonl`;
export const HANZI_WRITER_DATA_CHARS_SRC = `${base}/wenbun-assets/hanzi_writer_data_chars.txt`;

export const SLUG_NO_DATA_IN_DICT = "ERROR: information about this word is not available in the dictionary. Please report this issue to the developer.";
export const SLUG_NO_DATA_IN_HANZI_WRITER = "Character(s) in this word are not supported by Hanzi Writer. This word will be ignored";
export const SLUG_NO_DATA_IN_DICT_PREVIEW = "This word doesn't exist in the dictionary, try enabling extra dictionary"

export const DEFAULT_FSRS_PARAM =  [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542, 
]

export const WENBUN_AUDIO_URL = "https://github.com/ray-pH/wenbun-audio/raw/refs/heads/main"
// https://github.com/ray-pH/wenbun-audio/raw/refs/heads/main/mandarin/hugolpz-audio-cmn-64k/syllabs/cmn-chao2.mp3
export const ZH_AUDIO_DICT_SRC = `${base}/wenbun-assets/audio_dict/zh_audio_dict.json`;
export const YUE_AUDIO_DICT_SRC = `${base}/wenbun-assets/audio_dict/yue_audio_dict.json`;
export const WENBUN_AUDIO_ZH_PREFIX_SRC = `/hugolpz-audio-cmn-64k/syllabs/cmn-`

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
        help: "Specifies how new cards are interleaved with review cards.",
    },
    newPreviouslyStudiedCardPerDay: {
        label: "New Previously Studied Card Per Day",
        help: "Specifies the number of cards per day drawn from the \"Previously Studied\" pool.",
    },
    newPreviouslyStudiedCardOrder: {
        label: "New Previously Studied Card Order",
        help: "Specifies how cards from the “Previously Studied” pool are interleaved with review cards.",
    },
    gradeWarmUpCards: {
        label: "Grade New/Warm-Up Cards",
        help: "When disabled, the system will always make sure that new cards will be studied again the next day. (internally grade the last warm-up as \"Fail/Again\")",
    },
    startPreviouslyStudiedCardFromTheBack: {
        label: "Start Previously Studied Card From The Back",
        help: "When enabled, the previously studied card will be drawn from the back of the pool.",
    },
    
    uiScale: {
        label: "UI Scale",
        help: "Specifies the UI scale.",
    },
    customFontSize: {
        label: "Custom Font Size",
        help: "Specifies the custom font size for the UI Scale. 'small' is 10px, 'normal' is 16px. (min 8, max 32)",
    },
    
    learningSteps: {
        label: "Learning Steps",
        help: "Defines the sequence of intervals used by FSRS during the initial learning phase before cards enter the long-term review schedule.",
    },
    previouslyStudiedLearningSteps: {
        label: "Previously Studied Learning Steps",
        help: "Defines the sequence of intervals used by FSRS during the initial learning phase for cards in the \"Previously Studied\" pool before they enter the long-term review schedule.",
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
    gradingMethod: {
        label: "Grading Method",
        help: "Whether the system will grade the cards automatically or let the user manually grade them.",
    },
    strokeLeniency: {
        label: "Stroke Grading Leniency",
        help: "(default 1.5) This can be set to make stroke grading more or less lenient. The closer this is to 0 the more strictly the quiz is graded."
    },
    
    zhIsColorBasedOnTone: {
        label: "Color Characters Based On Their Tone",
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
    zhAlwaysShowReading: {
        label: "Always Show Reading",
        help: "When disabled, the reading will only be shown after the card is answered correctly.",
    },
    zhMandarinReading: {
        label: "Mandarin Reading",
        help: "Specifies which reading to show"
    },
    zhPlayAudio: {
        label: "Play Audio",
        help: "Play audio when the card is answered correctly or when displaying a new card.",
    },
    
    // custom deck
    deckName: {
        label: "Deck Name",
        help: "Specifies the name of the deck.",
    },
    deckLanguage: {
        label: "Deck Language",
        help: "Specifies the language of the deck.",
    },
    deckEnableCustomDictionary: {
        label: "Enable Custom Dictionary",
        help: "When enabled, the custom dictionary (CC-CEDICT) will be used to look up words in the deck. (initial loading may take a while)",
    },
}