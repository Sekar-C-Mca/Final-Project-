import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import ProjectWizard from './pages/ProjectWizard';
import MLTraining from './pages/MLTraining';
import FeatureExtraction from './pages/FeatureExtraction';
import DeployScript from './pages/DeployScript';

function App() {
    return (
        <ThemeProvider>
            <Router>
                <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project/:id"
                        element={
                            <ProtectedRoute>
                                <ProjectDetails />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ml-training"
                        element={
                            <ProtectedRoute>
                                <MLTraining />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/feature-extraction"
                        element={
                            <ProtectedRoute>
                                <FeatureExtraction />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/create-project"
                        element={
                            <ProtectedRoute>
                                <ProjectWizard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/deploy-script"
                        element={
                            <ProtectedRoute>
                                <DeployScript />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/home" element={<LandingPage />} />
                </Routes>
            </AuthProvider>
        </Router>
        </ThemeProvider>
    );
}

export default App;
