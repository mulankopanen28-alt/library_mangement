
import { useState, useEffect, useCallback } from 'react'
import { clean, positive } from './data'

const API_URL = 'http://localhost:5000/api/books'

export default function Books({
  books = [],
  setBooks,
  orders = [],
  canManage,
}) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [isbn, setIsbn] = useState('')
  const [qty, setQty] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const showMsg = (text, good = false) => {
    setMsg({ text, good })
  }

  // Normalize records returned by MySQL
  const normalizeBook = (book) => ({
    ...book,
    title: book.title ?? book.book_title ?? book.name ?? '',
    author: book.author ?? book.book_author ?? '',
    genre: book.genre ?? book.category ?? '',
    isbn: String(book.isbn ?? ''),
    quantity: Number(
      book.quantity ??
      book.available_quantity ??
      book.stock ??
      0
    ),
  })

  // Fetch all books from MySQL
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError('')

      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`)
      }

      const data = await response.json()

      console.log('Books received from MySQL:', data)

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data.books)
          ? data.books
          : null

      if (!records) {
        throw new Error('The API response does not contain a books array.')
      }

      setBooks(records.map(normalizeBook))
    } catch (error) {
      console.error('Failed to fetch books:', error)
      setFetchError(error.message)
    } finally {
      setLoading(false)
    }
  }, [setBooks])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Validate book fields
  const validateBook = (
    bookTitle,
    bookAuthor,
    bookGenre,
    bookIsbn,
    quantity
  ) => {
    const t = clean(bookTitle)
    const a = clean(bookAuthor)
    const g = clean(bookGenre)
    const i = clean(bookIsbn)
    const q = positive(quantity)

    if (!t || !a || !g) {
      showMsg('Please enter the title, author, and genre.')
      return null
    }

    if (!/^[0-9]+$/.test(i)) {
      showMsg('ISBN must contain numbers only.')
      return null
    }

    if (!q || !Number.isSafeInteger(Number(q))) {
      showMsg('Quantity must be a positive whole number.')
      return null
    }

    return {
      title: t,
      author: a,
      genre: g,
      isbn: i,
      quantity: Number(q),
    }
  }

  // Add book to MySQL
  const addBook = async (e) => {
    e.preventDefault()

    const newBook = validateBook(title, author, genre, isbn, qty)

    if (!newBook) return

    if (books.some((b) => String(b.isbn) === newBook.isbn)) {
      showMsg('That ISBN already exists.')
      return
    }

    try {
      setSaving(true)
      setMsg(null)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBook),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Failed to save book to MySQL.'
        )
      }

      // Reload records from the database after successful insertion
      await fetchBooks()

      setTitle('')
      setAuthor('')
      setGenre('')
      setIsbn('')
      setQty('')

      showMsg(data.message || 'Book saved to MySQL successfully.', true)
    } catch (error) {
      console.error('Error adding book:', error)
      showMsg(error.message || 'Failed to save book.')
    } finally {
      setSaving(false)
    }
  }

  // Update book in MySQL
  const updateBook = async (index) => {
    const book = books[index]
    if (!book) return

    const t = prompt('Title:', book.title)
    if (t === null) return

    const a = prompt('Author:', book.author)
    if (a === null) return

    const g = prompt('Genre:', book.genre)
    if (g === null) return

    const newIsbn = prompt('ISBN numbers only:', book.isbn)
    if (newIsbn === null) return

    const q = prompt('Quantity:', String(book.quantity))
    if (q === null) return

    const updatedBook = validateBook(t, a, g, newIsbn, q)
    if (!updatedBook) return

    if (
      books.some(
        (item, i) =>
          i !== index && String(item.isbn) === updatedBook.isbn
      )
    ) {
      showMsg('That ISBN already exists.')
      return
    }

    try {
      setSaving(true)
      setMsg(null)

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(book.isbn)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedBook),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Failed to update book.'
        )
      }

      await fetchBooks()
      showMsg(data.message || 'Book updated in MySQL successfully.', true)
    } catch (error) {
      console.error('Error updating book:', error)
      showMsg(error.message || 'Failed to update book.')
    } finally {
      setSaving(false)
    }
  }

  // Delete book from MySQL
  const deleteBook = async (index) => {
    const book = books[index]
    if (!book) return

    if (!confirm(`Delete "${book.title}"?`)) return

    const hasActiveOrder = orders.some(
      (order) =>
        String(order.bookIsbn) === String(book.isbn) &&
        ['Pending', 'Approved', 'Borrowed'].includes(order.status)
    )

    if (hasActiveOrder) {
      alert('This book has an active order.')
      return
    }

    try {
      setSaving(true)
      setMsg(null)

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(book.isbn)}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Failed to delete book.'
        )
      }

      await fetchBooks()
      showMsg(data.message || 'Book deleted from MySQL successfully.', true)
    } catch (error) {
      console.error('Error deleting book:', error)
      showMsg(error.message || 'Failed to delete book.')
    } finally {
      setSaving(false)
    }
  }

  // Shared table status
  const renderTableStatus = (columnCount) => {
    if (loading) {
      return (
        <tr>
          <td colSpan={columnCount}>Loading books...</td>
        </tr>
      )
    }

    if (fetchError) {
      return (
        <tr>
          <td colSpan={columnCount}>
            Error loading books: {fetchError}
            <br />
            <button type="button" onClick={fetchBooks}>
              Retry
            </button>
          </td>
        </tr>
      )
    }

    if (books.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount}>No books available.</td>
        </tr>
      )
    }

    return null
  }

  // Member view: read-only
  if (!canManage) {
    return (
      <>
        <h2>Available Books</h2>

        <div className="card">
          <p>
            Members can view books here. Orders are placed in Transactions.
          </p>

          {msg && (
            <div className={`message ${msg.good ? 'good' : 'bad'}`}>
              {msg.text}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Genre</th>
                  <th>ISBN</th>
                  <th>Available</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !fetchError &&
                  books.map((book, index) => (
                    <tr
                      key={book.isbn || index}
                      className={
                        Number(book.quantity) < 2 ? 'low-stock' : ''
                      }
                    >
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.genre}</td>
                      <td>{book.isbn}</td>
                      <td>{book.quantity}</td>
                    </tr>
                  ))}

                {renderTableStatus(5)}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  }

  // Staff view: add, update, and delete
  return (
    <>
      <h2>Book Management</h2>

      {msg && (
        <div className={`message ${msg.good ? 'good' : 'bad'}`}>
          {msg.text}
        </div>
      )}

      <div className="card">
        <h3>Add Book</h3>

        <form onSubmit={addBook}>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <input
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          <input
            placeholder="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            required
          />

          <input
            placeholder="ISBN (numbers only)"
            inputMode="numeric"
            pattern="[0-9]+"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            required
          />

          <input
            type="number"
            min="1"
            step="1"
            placeholder="Initial quantity"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add Book'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Manage Books</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Genre</th>
                <th>ISBN</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !fetchError &&
                books.map((book, index) => (
                  <tr
                    key={book.isbn || index}
                    className={
                      Number(book.quantity) < 2 ? 'low-stock' : ''
                    }
                  >
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.genre}</td>
                    <td>{book.isbn}</td>
                    <td>{book.quantity}</td>

                    <td className="actions">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateBook(index)}
                      >
                        Update
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={saving}
                        onClick={() => deleteBook(index)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

              {renderTableStatus(6)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
