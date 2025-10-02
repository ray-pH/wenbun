export const load = ({ url }) => {
    return {
        token: url.searchParams.get('token') || '',
    }
}