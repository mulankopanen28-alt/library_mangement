import { useState } from 'react'
import { clean } from './data'

export default function Login({ users, onLogin }) {
  const [membershipId, setMembershipId] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const id = clean(membershipId).toLowerCase()
    const u = users.find(
      (x) =>
        String(x.membershipId).toLowerCase() === id &&
        String(x.password) === password
    )
    if (!u) {
      setMsg({ text: 'Invalid membership ID or password.', good: false })
      return
    }
    if (u.approved === false) {
      setMsg({ text: 'Account is waiting for approval.', good: false })
      return
    }
    onLogin(u)
  }

  return (
    <main>
      <div className="card login-box">
        <h2>Library Login</h2>
        <p>Enter your membership ID and password.</p>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Membership ID"
            value={membershipId}
            onChange={(e) => setMembershipId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
          {msg && (
            <div className={`message ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>
          )}
        </form>
      </div>
    </main>
  )
}