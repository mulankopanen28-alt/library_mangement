export default function Dashboard({ books, orders }) {
  const low = books.filter((b) => Number(b.quantity) < 2).length
  const pending = orders.filter((o) => o.status === 'Pending').length
  const totalCopies = books.reduce((s, b) => s + Number(b.quantity || 0), 0)

  return (
    <>
      <h2>Dashboard</h2>
      <div className="grid">
        <div className="stat">
          Total Books
          <strong>{books.length}</strong>
        </div>
        <div className="stat">
          Copies Available
          <strong>{totalCopies}</strong>
        </div>
        <div className="stat">
          Low Stock
          <strong>{low}</strong>
        </div>
        <div className="stat">
          Pending Orders
          <strong>{pending}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Book Availability</h3>
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
              {books.map((b) => (
                <tr
                  key={b.isbn}
                  className={Number(b.quantity) < 2 ? 'low-stock' : ''}
                >
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.genre}</td>
                  <td>{b.isbn}</td>
                  <td>{b.quantity}</td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={5}>No books yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}