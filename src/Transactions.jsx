import { useState } from 'react'
import { clean, positive, isAdmin, orderStatus } from './data'

export default function Transactions({
  books,
  setBooks,
  orders,
  setOrders,
  transactions,
  setTransactions,
  messages,
  setMessages,
  currentUser,
}) {
  if (currentUser.role === 'Member') {
    return (
      <MemberTransactions
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
    )
  }

  return (
    <StaffTransactions
      books={books}
      setBooks={setBooks}
      transactions={transactions}
      setTransactions={setTransactions}
      messages={messages}
      currentUser={currentUser}
    />
  )
}

function MemberTransactions({
  books,
  setBooks,
  orders,
  setOrders,
  transactions,
  setTransactions,
  messages,
  setMessages,
  currentUser,
}) {
  const available = books.filter((b) => b.quantity > 0)
  const [memberId, setMemberId] = useState('')
  const [isbn, setIsbn] = useState('')
  const [qty, setQty] = useState(1)
  const [msg, setMsg] = useState(null)

  const myOrders = orders.filter((o) => o.memberId === currentUser.membershipId)

  const placeOrder = (e) => {
    e.preventDefault()
    const enteredId = clean(memberId)
    const q = positive(qty)
    const b = books.find((x) => x.isbn === isbn)

    if (enteredId.toLowerCase() !== clean(currentUser.membershipId).toLowerCase()) {
      setMsg({ text: 'Membership ID does not match your account.', good: false })
      return
    }
    if (!b || !q) {
      setMsg({ text: 'Choose a book and valid quantity.', good: false })
      return
    }
    if (q > b.quantity) {
      setMsg({ text: 'Not enough copies available.', good: false })
      return
    }

    const now = new Date()
    const due = new Date(now)
    due.setDate(due.getDate() + 14)

    const order = {
      id: Date.now().toString(),
      memberId: currentUser.membershipId,
      memberName: currentUser.name,
      bookIsbn: b.isbn,
      bookTitle: b.title,
      quantity: q,
      orderDate: now.toLocaleString(),
      status: 'Borrowed',
      returnDate: due.toLocaleString(),
      returnedDate: '',
      reason: '',
    }

    setBooks(
      books.map((x) =>
        x.isbn === b.isbn ? { ...x, quantity: x.quantity - q } : x
      )
    )
    setOrders([...orders, order])
    setTransactions([
      ...transactions,
      {
        date: now.toLocaleString(),
        type: 'Book borrowed',
        book: b.title,
        isbn: b.isbn,
        quantity: q,
        user: currentUser.name,
      },
    ])
    setMessages([
      ...messages,
      {
        date: now.toLocaleString(),
        type: 'New borrow',
        text: `${currentUser.name} (${currentUser.membershipId}) borrowed ${q} copy/copies of "${b.title}". Return due ${order.returnDate}.`,
        read: false,
      },
    ])

    setMemberId('')
    setIsbn('')
    setQty(1)
    setMsg({
      text: `Order successful. Return the book by ${order.returnDate}.`,
      good: true,
    })
  }

  const returnBook = (id) => {
    const o = orders.find((x) => x.id === id)
    const b = books.find((x) => x.isbn === o?.bookIsbn)
    if (
      !o ||
      !b ||
      o.memberId !== currentUser.membershipId ||
      !['Borrowed', 'Overdue'].includes(orderStatus(o))
    ) {
      return
    }
    if (!confirm(`Return "${o.bookTitle}" now?`)) return

    const returnedDate = new Date().toLocaleString()
    setBooks(
      books.map((x) =>
        x.isbn === b.isbn ? { ...x, quantity: x.quantity + o.quantity } : x
      )
    )
    setOrders(
      orders.map((x) =>
        x.id === id ? { ...x, status: 'Returned', returnedDate } : x
      )
    )
    setTransactions([
      ...transactions,
      {
        date: returnedDate,
        type: 'Book returned',
        book: b.title,
        isbn: b.isbn,
        quantity: o.quantity,
        user: currentUser.name,
      },
    ])
    setMessages([
      ...messages,
      {
        date: returnedDate,
        type: 'Book returned',
        text: `${currentUser.name} (${currentUser.membershipId}) returned ${o.quantity} copy/copies of "${b.title}".`,
        read: false,
      },
    ])
    setMsg({
      text: 'Book returned successfully. The administrator has received a message.',
      good: true,
    })
  }

  return (
    <>
      <h2>My Transactions</h2>
      <div className="card">
        <h3>Order a Book</h3>
        <p>Enter your membership ID to place an order.</p>
        <form onSubmit={placeOrder}>
          <input
            placeholder="Membership ID"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
          />
          <select value={isbn} onChange={(e) => setIsbn(e.target.value)} required>
            <option value="">Choose a book</option>
            {available.map((b) => (
              <option key={b.isbn} value={b.isbn}>
                {b.title} — {b.quantity} available
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />
          <button type="submit">Order Book</button>
          {msg && (
            <div className={`message ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>
          )}
        </form>
      </div>

      <div className="card">
        <h3>My Orders</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Qty</th>
                <th>Ordered</th>
                <th>Status</th>
                <th>Return Date/Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map((o) => {
                const st = orderStatus(o)
                const canReturn = ['Borrowed', 'Overdue'].includes(st)
                return (
                  <tr key={o.id}>
                    <td>{o.bookTitle}</td>
                    <td>{o.quantity}</td>
                    <td>{o.orderDate}</td>
                    <td className={`status ${st}`}>{st}</td>
                    <td>{o.returnDate || '-'}</td>
                    <td>
                      {canReturn ? (
                        <button
                          type="button"
                          className="success"
                          onClick={() => returnBook(o.id)}
                        >
                          Return Book
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
              {myOrders.length === 0 && (
                <tr>
                  <td colSpan={6}>No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function StaffTransactions({
  books,
  setBooks,
  transactions,
  setTransactions,
  messages,
  currentUser,
}) {
  const [stockIsbn, setStockIsbn] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [msg, setMsg] = useState(null)

  const stockChange = (type) => {
    const i = clean(stockIsbn)
    const q = positive(stockQty)
    const b = books.find((x) => x.isbn === i)
    if (!b || !q) {
      setMsg({ text: 'Enter a valid ISBN and quantity.', good: false })
      return
    }
    if (type === 'Manual borrow' && q > b.quantity) {
      setMsg({ text: 'Not enough stock.', good: false })
      return
    }
    const delta = type === 'Added stock' ? q : -q
    setBooks(
      books.map((x) =>
        x.isbn === i ? { ...x, quantity: x.quantity + delta } : x
      )
    )
    setTransactions([
      ...transactions,
      {
        date: new Date().toLocaleString(),
        type,
        book: b.title,
        isbn: i,
        quantity: q,
        user: currentUser.name,
      },
    ])
    setMsg({ text: `${type} recorded.`, good: true })
    setStockIsbn('')
    setStockQty('')
  }

  const sortedMessages = [...messages].reverse()

  return (
    <>
      <h2>Transactions</h2>
      <div className="card">
        <h3>Stock Management</h3>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            placeholder="Book ISBN"
            value={stockIsbn}
            onChange={(e) => setStockIsbn(e.target.value)}
            required
          />
          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
            required
          />
          <div className="actions">
            <button type="button" onClick={() => stockChange('Added stock')}>
              Add Stock
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => stockChange('Manual borrow')}
            >
              Record Borrow
            </button>
          </div>
          {msg && (
            <div className={`message ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>
          )}
        </form>
      </div>

      {isAdmin(currentUser) && (
        <div className="card">
          <h3>Administrator Messages</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {sortedMessages.map((m, i) => (
                  <tr key={i}>
                    <td>{m.date}</td>
                    <td>{m.type}</td>
                    <td>{m.text}</td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={3}>No messages.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Transaction History</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Book</th>
                <th>Qty</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {[...transactions].reverse().map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td>{t.type}</td>
                  <td>{t.book}</td>
                  <td>{t.quantity}</td>
                  <td>{t.user}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5}>No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}