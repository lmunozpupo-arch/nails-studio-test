import axios from "axios";

const api = axios.create({
    baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("salonapp_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            !window.location.pathname.startsWith("/login") &&
            !window.location.hash.includes("session_id=")
        ) {
            localStorage.removeItem("salonapp_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const apiErrorKey = (error) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) return "validation_error";
    return "generic";
};

export default api;
