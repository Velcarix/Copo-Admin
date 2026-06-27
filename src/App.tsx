import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { Licenses } from './pages/Licenses'
import { Login } from './pages/Login'

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('adminKey'))

  if (!isAuthed) {
    return <Login onSuccess={() => setIsAuthed(true)} />
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="licenses" element={<Licenses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
