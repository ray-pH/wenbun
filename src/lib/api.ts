const API_BASE_URL = import.meta.env.VITE_WENBUN_SERVER_URL || "http://localhost:3000";

export enum ApiRoute {
    Profile = "/profile",
    ProfileData = "/profiledata",
    ReviewLog = "/reviewlog",
    ReviewLogMostRecent = "/reviewlog/mostrecent",
    AuthGoogle = "/auth/google",
    AuthLogout = "/auth/logout",
}

export function apiUrl(route: ApiRoute, params?: Record<string, string | number | boolean>): string {
    let url = `${API_BASE_URL}${route}`;
    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            searchParams.append(key, String(value));
        }
        url += `?${searchParams.toString()}`;
    }
    return url;
}

// Example usage:
// fetch(apiUrl(ApiRoute.ProfileData, { decision: "push" }), { ...fetchOptions })

// For auth redirects (window.location.assign):
export function apiAuthUrl(route: ApiRoute.AuthGoogle | ApiRoute.AuthLogout): string {
    return `${API_BASE_URL}${route}`;
}