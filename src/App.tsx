import { AuthGate } from './components/AuthGate'
import { Board } from './components/Board'

export default function App() {
  return (
    <AuthGate>
      <Board />
    </AuthGate>
  )
}
