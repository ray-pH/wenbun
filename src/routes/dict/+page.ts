export const load = ({ url }) => {
    return {
        char: url.searchParams.get('char') || '',
        deckId: url.searchParams.get('deckId') || null,
    }
}