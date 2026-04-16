export const load = ({ url }) => {
    return {
        leniency: url.searchParams.get('leniency') || '',
        fadeDuration: url.searchParams.get('fadeDuration') || '',
        fromDeckId: url.searchParams.get('fromDeckId') || '',
        deckId: url.searchParams.get('deckId') || '',
    }
}