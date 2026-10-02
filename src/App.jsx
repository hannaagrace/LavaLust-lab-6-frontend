import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  // =====================================
  // AUTH STATE
  // =====================================

  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showRegister, setShowRegister] = useState(false);

  // =====================================
  // REGISTER STATE
  // =====================================

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // =====================================
  // PRODUCT STATE
  // =====================================

  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    product_name: "",
    description: "",
    price: "",
    quantity: "",
  });

  // =====================================
  // ROLE CHECK
  // =====================================

  const isAdmin = user?.role === "admin";

  // =====================================
  // AXIOS AUTH CONFIG
  // =====================================

  const getAuthConfig = () => {
    const token = localStorage.getItem("access_token");

    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // =====================================
  // GET PRODUCTS
  // =====================================

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/products`,
        getAuthConfig()
      );

      console.log("GET PRODUCTS:", response.data);

      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);

      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        handleLogout();
        return;
      }

      alert(
        "Failed to load products. Make sure your LavaLust API is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // LOAD PRODUCTS AFTER LOGIN
  // =====================================

  useEffect(() => {
    if (loggedIn) {
      fetchProducts();
    }
  }, [loggedIn]);

  // =====================================
  // LOGIN
  // =====================================

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          username,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("LOGIN RESPONSE:", response.data);

      if (!response.data.status) {
        alert("Login failed.");
        return;
      }

      const tokens = response.data.tokens;

      if (!tokens?.access_token) {
        alert("Login successful, but no access token was returned.");
        console.error("Missing access token:", response.data);
        return;
      }

      // Save access token
      localStorage.setItem(
        "access_token",
        tokens.access_token
      );

      // Save refresh token
      if (tokens.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          tokens.refresh_token
        );
      }

      // Save user including role
      const loggedUser = response.data.user;

      localStorage.setItem(
        "user",
        JSON.stringify(loggedUser)
      );

      setUser(loggedUser);
      setLoggedIn(true);

      setPassword("");

      alert(
        `Login successful! Welcome, ${loggedUser.username}.`
      );
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        console.error(
          "LOGIN API RESPONSE:",
          error.response.data
        );

        alert(
          error.response.data?.message ||
            error.response.data?.error ||
            "Invalid username or password."
        );
      } else {
        alert(
          "Network/CORS error. Make sure LavaLust is running."
        );
      }
    }
  };

  // =====================================
  // REGISTER
  // =====================================
  // IMPORTANT:
  // There is NO role field here.
  // Every newly registered account is automatically USER.

  const handleRegister = async (e) => {
    e.preventDefault();

    if (
      !registerUsername ||
      !registerEmail ||
      !registerPassword
    ) {
      alert("Please complete all registration fields.");
      return;
    }

    if (registerPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        {
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "REGISTER RESPONSE:",
        response.data
      );

      if (!response.data.status) {
        alert("Registration failed.");
        return;
      }

      alert(
        "Account created successfully! Your account is a User account."
      );

      // Put registered username in login field
      setUsername(registerUsername);

      // Clear registration fields
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");

      // Return to login
      setShowRegister(false);
    } catch (error) {
      console.error("Register error:", error);

      if (error.response) {
        console.error(
          "REGISTER API RESPONSE:",
          error.response.data
        );

        alert(
          error.response.data?.message ||
            error.response.data?.error ||
            "Registration failed."
        );
      } else {
        alert(
          "Network/CORS error. Make sure LavaLust is running."
        );
      }
    }
  };

  // =====================================
  // LOGOUT
  // =====================================

  const handleLogout = async () => {
    const refreshToken =
      localStorage.getItem("refresh_token");

    try {
      if (refreshToken) {
        await axios.post(
          `${API_URL}/auth/logout`,
          {
            refresh_token: refreshToken,
          },
          getAuthConfig()
        );
      }
    } catch (error) {
      console.error("Logout API error:", error);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    setLoggedIn(false);
    setUser(null);

    setUsername("");
    setPassword("");

    setProducts([]);

    setShowForm(false);
    setEditingProduct(null);
  };

  // =====================================
  // FORM INPUT
  // =====================================

  const handleInputChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================
  // ADD / UPDATE PRODUCT
  // =====================================

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    // Frontend protection
    if (!isAdmin) {
      alert("Only administrators can modify products.");
      return;
    }

    if (
      !form.product_name ||
      !form.price ||
      form.quantity === ""
    ) {
      alert("Please complete the required fields.");
      return;
    }

    try {
      const productData = {
        product_name: form.product_name,
        description: form.description,
        price: Number(form.price),
        quantity: Number(form.quantity),
      };

      if (editingProduct) {
        // UPDATE
        const response = await axios.put(
          `${API_URL}/products/${editingProduct.id}`,
          productData,
          getAuthConfig()
        );

        console.log(
          "UPDATE PRODUCT:",
          response.data
        );

        alert("Product updated successfully!");
      } else {
        // CREATE
        const response = await axios.post(
          `${API_URL}/products`,
          productData,
          getAuthConfig()
        );

        console.log(
          "CREATE PRODUCT:",
          response.data
        );

        alert("Product added successfully!");
      }

      await fetchProducts();

      setForm({
        product_name: "",
        description: "",
        price: "",
        quantity: "",
      });

      setEditingProduct(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Product save error:",
        error
      );

      if (error.response) {
        console.error(
          "API response:",
          error.response.data
        );

        if (error.response.status === 401) {
          alert(
            "Authentication required. Please login again."
          );

          handleLogout();
          return;
        }

        if (error.response.status === 403) {
          alert(
            "Access denied. Only administrators can perform this action."
          );

          return;
        }

        alert(
          error.response.data?.message ||
            error.response.data?.error ||
            "Failed to save product."
        );
      } else {
        alert(
          "Network/CORS error. Make sure LavaLust is running."
        );
      }
    }
  };

  // =====================================
  // EDIT PRODUCT
  // =====================================

  const handleEdit = (product) => {
    if (!isAdmin) {
      alert("Only administrators can edit products.");
      return;
    }

    setEditingProduct(product);

    setForm({
      product_name: product.product_name || "",
      description: product.description || "",
      price: product.price || "",
      quantity: product.quantity ?? "",
    });

    setShowForm(true);
  };

  // =====================================
  // DELETE PRODUCT
  // =====================================

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert("Only administrators can delete products.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/products/${id}`,
        getAuthConfig()
      );

      console.log(
        "DELETE PRODUCT:",
        response.data
      );

      alert("Product deleted successfully!");

      await fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);

      if (error.response) {
        console.error(
          "API response:",
          error.response.data
        );

        if (error.response.status === 401) {
          alert(
            "Authentication required. Please login again."
          );

          handleLogout();
          return;
        }

        if (error.response.status === 403) {
          alert(
            "Access denied. Only administrators can delete products."
          );

          return;
        }

        alert(
          error.response.data?.message ||
            error.response.data?.error ||
            "Failed to delete product."
        );
      } else {
        alert(
          "Network/CORS error. Make sure LavaLust is running."
        );
      }
    }
  };

  // =====================================
  // OPEN ADD FORM
  // =====================================

  const openAddForm = () => {
    if (!isAdmin) {
      alert("Only administrators can add products.");
      return;
    }

    setEditingProduct(null);

    setForm({
      product_name: "",
      description: "",
      price: "",
      quantity: "",
    });

    setShowForm(true);
  };

  // =====================================
  // LOGIN / REGISTER PAGE
  // =====================================

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">

          {!showRegister ? (
            <>
              <button
                type="button"
                className="back-button"
                onClick={() => setShowRegister(false)}
              >
                Product API
              </button>

              <div className="login-icon">
                🔐
              </div>

              <h1>Welcome Back</h1>

              <p className="login-subtitle">
                Login to access the product application
              </p>

              <form onSubmit={handleLogin}>
                <label>Username</label>

                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                />

                <label>Password</label>

                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

                <button
                  className="login-button"
                  type="submit"
                >
                  Login
                </button>
              </form>

              <p className="login-note">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    setShowRegister(true)
                  }
                >
                  Create Account
                </button>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="back-button"
                onClick={() =>
                  setShowRegister(false)
                }
              >
                ← Back to Login
              </button>

              <div className="login-icon">
                👤
              </div>

              <h1>Create Account</h1>

              <p className="login-subtitle">
                Create a user account to view products
              </p>

              <form onSubmit={handleRegister}>
                <label>Username</label>

                <input
                  type="text"
                  placeholder="Choose a username"
                  value={registerUsername}
                  onChange={(e) =>
                    setRegisterUsername(
                      e.target.value
                    )
                  }
                />

                <label>Email</label>

                <input
                  type="email"
                  placeholder="Enter email"
                  value={registerEmail}
                  onChange={(e) =>
                    setRegisterEmail(
                      e.target.value
                    )
                  }
                />

                <label>Password</label>

                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={registerPassword}
                  onChange={(e) =>
                    setRegisterPassword(
                      e.target.value
                    )
                  }
                />

                <button
                  className="login-button"
                  type="submit"
                >
                  Create Account
                </button>
              </form>

              <p className="login-note">
                Already have an account?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    setShowRegister(false)
                  }
                >
                  Login
                </button>
              </p>
            </>
          )}

        </div>
      </div>
    );
  }

  // =====================================
  // PRODUCT PAGE
  // =====================================

  return (
    <div className="app">

      {/* NAVBAR */}

      <header className="navbar">

        <div className="brand">

          <div className="brand-icon">
            📦
          </div>

          <div>
            <h2>Product Management</h2>

            <span>
              LavaLust API + React.js
            </span>
          </div>

        </div>

        <div className="nav-actions">

          <div className="user-info">

            <div className="user-avatar">
              {user?.username
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.username}
              </strong>

              <small>
                {isAdmin
                  ? "Administrator"
                  : "User / Viewer"}
              </small>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="container">

        {/* PAGE HEADER */}

        <div className="page-heading">

          <div>
            <div className="eyebrow">
              PRODUCT CATALOG
            </div>

            <h1>Products</h1>

            <p>
              {isAdmin
                ? "Manage your product inventory."
                : "View the available products."}
            </p>
          </div>

          {/* ADMIN ONLY */}

          {isAdmin && (
            <button
              className="add-button"
              onClick={openAddForm}
            >
              + Add Product
            </button>
          )}

        </div>

        {/* ROLE NOTICE */}

        {isAdmin ? (
          <div className="admin-notice">

            <div className="notice-icon">
              🛡️
            </div>

            <div>
              <strong>
                Administrator Access
              </strong>

              <p>
                You can add, edit, and delete products.
              </p>
            </div>

          </div>
        ) : (
          <div className="viewer-notice">

            <div className="notice-icon">
              👁️
            </div>

            <div>
              <strong>
                View Only Access
              </strong>

              <p>
                You are logged in as a user.
                Product modification is restricted.
              </p>
            </div>

          </div>
        )}

        {/* PRODUCT FORM — ADMIN ONLY */}

        {isAdmin && showForm && (
          <div className="form-card">

            <div className="form-header">

              <div>
                <div className="eyebrow">
                  PRODUCT
                </div>

                <h2>
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>
              </div>

              <button
                className="close-form"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmitProduct}
            >

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Product Name
                  </label>

                  <input
                    name="product_name"
                    value={form.product_name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Description
                  </label>

                  <input
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Enter description"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Price
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />

                </div>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  {editingProduct
                    ? "Update Product"
                    : "Save Product"}
                </button>

              </div>

            </form>

          </div>
        )}

        {/* PRODUCT TABLE */}

        <div className="table-card">

          <div className="table-header">

            <div>
              <h2>
                Product List
              </h2>

              <p>
                {products.length} product
                {products.length !== 1
                  ? "s"
                  : ""}{" "}
                available
              </p>
            </div>

            <button
              className="refresh-button"
              onClick={fetchProducts}
            >
              ↻ Refresh
            </button>

          </div>

          <div className="table-wrapper">

            {loading ? (
              <div className="empty-state">

                <div className="loader"></div>

                <p>
                  Loading products...
                </p>

              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  📦
                </div>

                <h3>
                  No Products Yet
                </h3>

                <p>
                  There are currently no products
                  available.
                </p>

              </div>
            ) : (
              <table>

                <thead>

                  <tr>
                    <th>Product</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Quantity</th>

                    {isAdmin && (
                      <th>Actions</th>
                    )}
                  </tr>

                </thead>

                <tbody>

                  {products.map((product) => (

                    <tr key={product.id}>

                      <td>
                        <strong>
                          {product.product_name}
                        </strong>
                      </td>

                      <td>
                        {product.description ||
                          "—"}
                      </td>

                      <td className="price">
                        ₱
                        {Number(
                          product.price
                        ).toFixed(2)}
                      </td>

                      <td>
                        <span className="quantity">
                          {product.quantity}
                        </span>
                      </td>

                      {/* ADMIN ONLY */}

                      {isAdmin && (
                        <td>

                          <div className="actions">

                            <button
                              className="edit-button"
                              onClick={() =>
                                handleEdit(product)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                handleDelete(
                                  product.id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>
                      )}

                    </tr>

                  ))}

                </tbody>

              </table>
            )}

          </div>

        </div>

      </main>

      {/* FOOTER */}

      <footer>
        Product Management System •
        LavaLust API + React.js
      </footer>

    </div>
  );
}

export default App;