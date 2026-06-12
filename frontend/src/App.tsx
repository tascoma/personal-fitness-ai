import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Exercises } from './pages/Exercises'
import { History } from './pages/History'
import { LogWorkout } from './pages/LogWorkout'
import { More } from './pages/More'
import { Progress } from './pages/Progress'
import { SessionDetail } from './pages/SessionDetail'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/more" element={<More />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
