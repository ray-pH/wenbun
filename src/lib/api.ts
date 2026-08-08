import { isTauri } from "@tauri-apps/api/core";

const API_BASE_URL = import.meta.env.VITE_WENBUN_SERVER_URL || "http://localhost:3000";
export const IS_USE_TOKEN_AUTH = isTauri();

export enum ApiRoute {
    Profile = "/profile",
    ProfileData = "/profiledata",
    ProfileDataMetadata = "/profiledata/metadata",
    ReviewLog = "/reviewlog",
    AuthGoogle = "/auth/google",
    AuthLogout = "/auth/logout",
    AuthGoogleToken = "/auth/google/token",
    AccountDeletionRequest = "/account-delete/request-delete",
    AccountDelete = "/account-delete/delete",
}

export async function apiFetch(url: string, body?: Record<string, any>): Promise<Response> {
    if (IS_USE_TOKEN_AUTH) {
        const token = localStorage.getItem("jwt");
        return await fetch(url, {
            ...body,
            headers: {
                "Authorization": `Bearer ${token}`,
                ...body?.headers,
            }
        });
    } else {
        return await fetch(url, {
            ...body,
            credentials: "include",
        });
    }
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
export function apiAuthUrl(route: ApiRoute.AuthGoogle | ApiRoute.AuthGoogleToken | ApiRoute.AuthLogout): string {
    return `${API_BASE_URL}${route}`;
}