import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Home from './pages/Home'
import MainLayout from './pages/MainLayout'
import Dashboard from './pages/Dashboard'
import Session from './pages/Session'
import History from './pages/History'
import Import from './pages/Import'
import Planner from './pages/Planner'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/import" element={<Import />} />
            <Route path="/session/:id" element={<Session />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
