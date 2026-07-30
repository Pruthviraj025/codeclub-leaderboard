import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({

    children,

    adminOnly = false

}) {

    const {

        user,

        isAuthenticated

    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Not logged in
    |--------------------------------------------------------------------------
    */

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/"
                replace
            />
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Admin only
    |--------------------------------------------------------------------------
    */

    if (

        adminOnly &&

        user.role !== "admin"

    ) {

        return (
            <Navigate
                to="/leaderboard"
                replace
            />
        );

    }

    return children;

}