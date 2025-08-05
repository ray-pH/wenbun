export const load = ({ url }) => {
    return {
        deckId: url.searchParams.get('id') || '',
        isExtraStudy: url.searchParams.get('isExtraStudy') === 'true',
        cardIds: url.searchParams.get('cardIds') || encodeURIComponent('[]'),
    }
}