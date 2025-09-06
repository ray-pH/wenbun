export const load = ({ url }) => {
    return {
        char: url.searchParams.get('char') || '',
    }
}