import { useState, useEffect, useCallback } from 'react'
import {
  loadBooks,
  loadUsers,
  loadTransactions,
  loadOrders,
  loadMessages,
  saveAll,
  isAdmin,
  canManageBooks,
} from './data'
import Login from './Login'
import Dashboard from './Dashboard'
import Books from './Books'
import Transactions from './Transactions'
import Users from './Users'

export default function App() {
  const [books, setBooks] = useState(loadBooks)
  const [users, setUsers] = useState(loadUsers)
  const [transactions, setTransactions] = useState(loadTransactions)
  const [orders, setOrders] = useState(loadOrders)
  const [messages, setMessages] = useState(loadMessages)
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('dashboard')

  const persist = useCallback(() => {
    saveAll({ books, users, transactions, orders, messages })
  }, [books, users, transactions, orders, messages])

  useEffect(() => {
    persist()
  }, [persist])

  const logout = () => {
    setCurrentUser(null)
    setPage('dashboard')
  }

  if (!currentUser) {
    return (
      <>
        <header>
          <h1>LIMKOKWING LIBRARY</h1>
          <p>Library books, members, orders and stock in one place.</p>
        </header>
        <Login users={users} onLogin={setCurrentUser} />
      </>
    )
  }

  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'books', label: 'Books' },
    { key: 'transactions', label: 'Transactions' },
  ]
  if (isAdmin(currentUser)) {
    navItems.push({ key: 'users', label: 'Users' })
  }

  return (
    <>
      <header>
        <h1>LIMKOKWING LIBRARY</h1>
        <p>Library books, members, orders and stock in one place.</p>
      </header>

      <nav>
        {navItems.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={page === key ? 'active' : ''}
            onClick={() => setPage(key)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="danger" onClick={logout}>
          Logout
        </button>
      </nav>

      <main>
        {page === 'dashboard' && (
          <Dashboard books={books} orders={orders} />
        )}
        {page === 'books' && (
          <Books
            books={books}
            setBooks={setBooks}
            orders={orders}
            canManage={canManageBooks(currentUser)}
          />
        )}
        {page === 'transactions' && (
          <Transactions
            books={books}
            setBooks={setBooks}
            orders={orders}
            setOrders={setOrders}
            transactions={transactions}
            setTransactions={setTransactions}
            messages={messages}
            setMessages={setMessages}
            currentUser={currentUser}
          />
        )}
        {page === 'users' && isAdmin(currentUser) && (
          <Users
            users={users}
            setUsers={setUsers}
            currentUser={currentUser}
          />
        )}
      </main>

      <footer>
        Logged in as {currentUser.name} ({currentUser.role})
      </footer>
    </>
  )
}