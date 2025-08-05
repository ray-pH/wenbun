export const load = ({ url }) => {
    return {
        deckId: url.searchParams.get('id') || ''
    }
}