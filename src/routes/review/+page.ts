import { ExtraStudyMode } from '$lib/appExtraStudyHandler.js'

export const load = ({ url }) => {
    return {
        deckId: url.searchParams.get('id') || '',
        isExtraStudy: url.searchParams.get('isExtraStudy') === 'true',
        cardIds: url.searchParams.get('cardIds') || encodeURIComponent('[]'),
        mode: url.searchParams.get('mode') || ExtraStudyMode.Normal,
    }
}