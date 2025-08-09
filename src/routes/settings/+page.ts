export const load = ({ url }) => {
    return {
        leniency: url.searchParams.get('leniency') || ''
    }
}