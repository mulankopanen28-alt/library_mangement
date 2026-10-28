const DEFAULT_ADMIN = {
  name: 'Main Administrator',
  membershipId: '100',
  password: '1234',
  role: 'Admin',
  approved: true,
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function loadBooks() {
  return load('books', [])
}

export function loadUsers() {
  let users = load('users', [DEFAULT_ADMIN])
  let admin = users.find((u) => String(u.membershipId || u.id) === '100')
  if (!admin) {
    users.push({ ...DEFAULT_ADMIN })
  } else {
    admin.membershipId = '100'
    admin.password = '1234'
    admin.role = 'Admin'
    admin.approved = true
  }
  localStorage.setItem('users', JSON.stringify(users))
  return users
}

export function loadTransactions() {
  return load('transactions', [])
}

export function loadOrders() {
  return load('orders', [])
}

export function loadMessages() {
  return load('messages', [])
}

export function saveAll({ books, users, transactions, orders, messages }) {
  localStorage.setItem('books', JSON.stringify(books))
  localStorage.setItem('users', JSON.stringify(users))
  localStorage.setItem('transactions', JSON.stringify(transactions))
  localStorage.setItem('orders', JSON.stringify(orders))
  localStorage.setItem('messages', JSON.stringify(messages))
}

export function clean(v) {
  return String(v ?? '').trim()
}

export function positive(v) {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : 0
}

export function canManageBooks(user) {
  return user && ['Admin', 'Librarian'].includes(user.role)
}

export function isAdmin(user) {
  return user?.role === 'Admin'
}

export function orderStatus(o) {
  if ((o.status === 'Borrowed' || o.status === 'Approved') && o.returnDate) {
    const d = new Date(o.returnDate)
    if (!isNaN(d) && d < Date.now()) return 'Overdue'
  }
  return o.status
}