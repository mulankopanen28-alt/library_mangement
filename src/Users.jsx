
import { useState, useEffect } from 'react'
import { clean } from './data'

const API_URL = 'http://localhost:5000/api/users'

const toDatabaseRole = (role) => {
  const roles = {
    Member: 'student',
    Librarian: 'librarian',
    Admin: 'admin',
    student: 'student',
    librarian: 'librarian',
    admin: 'admin',
  }

  return roles[role] || 'student'
}

const toDisplayRole = (role) => {
  const roles = {
    student: 'Member',
    librarian: 'Librarian',
    admin: 'Admin',
  }

  return roles[role] || role
}

const normalizeUser = (user) => ({
  ...user,
  id: user.user_id ?? user.id,
  name: user.full_name ?? user.name ?? '',
  email: user.email ?? user.membershipId ?? '',
  membershipId: user.email ?? user.membershipId ?? '',
  role: toDisplayRole(user.role),
})

export default function Users({
  users = [],
  setUsers,
  currentUser = {},
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Member')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const showMsg = (text, good = false) => {
    setMsg({ text, good })
  }

  // Fetch users from MySQL
  useEffect(() => {
    let cancelled = false

    const fetchUsers = async () => {
      try {
        setLoading(true)

        const response = await fetch(API_URL)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load users.')
        }

        if (!Array.isArray(data)) {
          throw new Error('The users API did not return an array.')
        }

        if (!cancelled) {
          setUsers(data.map(normalizeUser))
        }
      } catch (error) {
        if (!cancelled) {
          showMsg(error.message, false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [setUsers])

  // Add user to MySQL
  const addUser = async (e) => {
    e.preventDefault()
    setMsg(null)

    const fullName = clean(name)
    const normalizedEmail = clean(email).toLowerCase()

    if (!fullName || !normalizedEmail || !password) {
      showMsg('Please complete all fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showMsg('Please enter a valid email address.')
      return
    }

    if (
      users.some(
        (user) =>
          String(user.email ?? user.membershipId ?? '').toLowerCase() ===
          normalizedEmail
      )
    ) {
      showMsg('This email already exists.')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: normalizedEmail,
          password,
          role: toDatabaseRole(role),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add user.')
      }

      if (!data.user) {
        throw new Error(
          'The server saved the request but did not return the created user.'
        )
      }

      const newUser = normalizeUser(data.user)

      setUsers((previousUsers) => [
        newUser,
        ...previousUsers.filter(
          (user) => user.id !== newUser.id
        ),
      ])

      setName('')
      setEmail('')
      setPassword('')
      setRole('Member')

      showMsg(data.message || 'User saved to MySQL successfully.', true)
    } catch (error) {
      showMsg(error.message, false)
    } finally {
      setSaving(false)
    }
  }

  // Update an existing MySQL user
  const updateUser = async (user) => {
    const fullName = prompt('Full name:', user.name)
    if (fullName === null) return

    const userEmail = prompt('Email:', user.email)
    if (userEmail === null) return

    const newRole = prompt(
      'Role: Member, Librarian or Admin',
      user.role
    )
    if (newRole === null) return

    const normalizedName = clean(fullName)
    const normalizedEmail = clean(userEmail).toLowerCase()

    if (!normalizedName || !normalizedEmail) {
      showMsg('Name and email are required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showMsg('Please enter a valid email address.')
      return
    }

    if (!['Member', 'Librarian', 'Admin'].includes(newRole)) {
      showMsg('Invalid role.')
      return
    }

    if (
      users.some(
        (item) =>
          item.id !== user.id &&
          String(item.email ?? item.membershipId ?? '').toLowerCase() ===
            normalizedEmail
      )
    ) {
      showMsg('This email already exists.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: normalizedName,
          email: normalizedEmail,
          role: toDatabaseRole(newRole),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user.')
      }

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? normalizeUser({
                ...item,
                full_name: normalizedName,
                email: normalizedEmail,
                role: toDatabaseRole(newRole),
              })
            : item
        )
      )

      showMsg(data.message || 'User updated in MySQL successfully.', true)
    } catch (error) {
      showMsg(error.message, false)
    }
  }

  // Delete an existing MySQL user
  const deleteUser = async (user) => {
    const currentEmail = currentUser.email ?? currentUser.membershipId

    if (
      currentUser.id === user.id ||
      currentUser.user_id === user.id ||
      (
        currentEmail &&
        String(currentEmail).toLowerCase() ===
          String(user.email).toLowerCase()
      )
    ) {
      showMsg('You cannot delete your own account.')
      return
    }

    if (!confirm(`Delete ${user.name}? This will remove the MySQL record.`)) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/${user.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user.')
      }

      setUsers((previousUsers) =>
        previousUsers.filter((item) => item.id !== user.id)
      )

      showMsg(data.message || 'User deleted from MySQL successfully.', true)
    } catch (error) {
      showMsg(error.message, false)
    }
  }

  return (
    <>
      <h2>User Management</h2>

      {msg && (
        <div
          className={`message ${msg.good ? 'good' : 'bad'}`}
          role="status"
        >
          {msg.text}
        </div>
      )}

      <div className="card">
        <h3>Add User</h3>

        <form onSubmit={addUser}>
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Member">Member</option>
            <option value="Librarian">Librarian</option>
            <option value="Admin">Admin</option>
          </select>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add User'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Accounts</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>No users found.</td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id ?? user.email ?? index}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        onClick={() => updateUser(user)}
                        disabled={!user.id}
                      >
                        Update
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteUser(user)}
                        disabled={!user.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
