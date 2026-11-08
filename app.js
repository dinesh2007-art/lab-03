import express from "express";
import dotenv from "dotenv";
import { initializeDBAndServer, queryAll, queryGet, queryRun } from "./database.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. GET /books (Search, Filter, Sort, Pagination)
app.get("/books", (req, res) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = req.query;

    const allowedSortColumns = ["id", "title", "author", "price"];
    const sortColumn = allowedSortColumns.includes(order_by) ? order_by : "id";
    const sortOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    let queryConditions = ["title LIKE ?"];
    let queryParams = [`%${search_q}%`];

    if (min_price !== undefined && max_price !== undefined) {
      queryConditions.push("price BETWEEN ? AND ?");
      queryParams.push(parseFloat(min_price), parseFloat(max_price));
    } else if (min_price !== undefined) {
      queryConditions.push("price >= ?");
      queryParams.push(parseFloat(min_price));
    } else if (max_price !== undefined) {
      queryConditions.push("price <= ?");
      queryParams.push(parseFloat(max_price));
    }

    const whereClause = `WHERE ${queryConditions.join(" AND ")}`;

    const sqlQuery = `
      SELECT * FROM books
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(parsedLimit, parsedOffset);

    const books = queryAll(sqlQuery, queryParams);
    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 2. GET /books/:id
app.get("/books/:id", (req, res) => {
  try {
    const { id } = req.params;
    const book = queryGet("SELECT * FROM books WHERE id = ?", [id]);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 3. POST /books (Validation + Create)
app.post("/books", (req, res) => {
  try {
    const { title, author, price } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Title is required and must be a valid string" });
    }
    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({ message: "Author is required and must be a valid string" });
    }
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "Price must be a valid positive number" });
    }

    const result = queryRun(
      "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
      [title.trim(), author.trim(), Number(price)]
    );

    return res.status(201).json({
      message: "Book created successfully",
      bookId: result.lastID,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 4. PUT /books/:id (Update)
app.put("/books/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, price } = req.body;

    const existingBook = queryGet("SELECT * FROM books WHERE id = ?", [id]);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (!title || !author || price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ message: "Invalid input fields for updating book" });
    }

    queryRun(
      "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
      [title.trim(), author.trim(), Number(price), id]
    );

    return res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 5. DELETE /books/:id (Delete)
app.delete("/books/:id", (req, res) => {
  try {
    const { id } = req.params;

    const existingBook = queryGet("SELECT * FROM books WHERE id = ?", [id]);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    queryRun("DELETE FROM books WHERE id = ?", [id]);
    return res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

const startServer = async () => {
  try {
    await initializeDBAndServer();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("DB Initialization error:", error.message);
    process.exit(1);
  }
};

startServer();