import {
    createContext,
    useContext,
    useMemo,
    useState
} from "react";

import {
    getSessionUser,
    saveSession,
    clearSession
} from "../api";

const AuthContext =
    createContext(null);

export function AuthProvider({
    children
}) {

    const [user, setUser] =
        useState(getSessionUser());

    const isAuthenticated =
        !!user;

    function login(
        token,
        userData
    ) {

        saveSession(
            token,
            userData
        );

        setUser(userData);

    }

    function logout() {

        clearSession();

        setUser(null);

    }

    const value =
        useMemo(
            () => ({

                user,

                isAuthenticated,

                login,

                logout

            }),
            [user]
        );

    return (

        <AuthContext.Provider
            value={value}
        >

            {children}

        </AuthContext.Provider>

    );

}

export function useAuth() {

    return useContext(
        AuthContext
    );

}