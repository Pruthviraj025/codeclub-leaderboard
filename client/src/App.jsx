import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {

    return (

        <BrowserRouter>

            <Routes>

                {/* Public */}

                <Route
                    path="/"
                    element={<LandingPage />}
                />

                {/* Logged-in users */}

                <Route
                    path="/leaderboard"
                    element={
                        <ProtectedRoute>
                            <LeaderboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile/:userId"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />

                {/* Admin only */}

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute
                            adminOnly
                        >
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>

    );

}