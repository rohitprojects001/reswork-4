/* =========================================================
   RESWORK ADMIN — login, routing, dashboard, orders, products
   (data layer = Firebase Firestore/Storage, real-time)
   ========================================================= */

const ADMIN_CREDS = { user: "admin", pass: "reswork123" };
const SESSION_KEY = "reswork_admin_session";

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._t);
  window._t = setTimeout(() => t.classList.remove("show"), 2200);
}

window.addEventListener("reswork-db-unconfigured", () => {
  document.getElementById("setupBanner").style.display = "block";
});

/* ---------- LOGIN ---------- */
const loginWrap = document.getElementById("loginWrap");
const adminShell = document.getElementById("adminShell");
let adminInitialized = false;

function checkSession() {
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    loginWrap.style.display = "none";
    adminShell.style.display = "grid";
    if (!adminInitialized) { initAdmin(); adminInitialized = true; }
  } else {
    loginWrap.style.display = "flex";
    adminShell.style.display = "none";
  }
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = e.target.user.value.trim();
  const pass = e.target.pass.value;
  if (user === ADMIN_CREDS.user && pass === ADMIN_CREDS.pass) {
    sessionStorage.setItem(SESSION_KEY, "true");
    checkSession();
  } else {
    document.getElementById("loginError").textContent = "Invalid username or password.";
  }
});

checkSession();

/* ---------- everything below only runs after login ---------- */
function initAdmin() {
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    checkSession();
  });

  const sections = ["dashboard", "orders", "products", "customers"];
  let currentSection = "dashboard";

  function goTo(section) {
    currentSection = section;
    sections.forEach((s) => {
      document.getElementById("section-" + s).style.display = s === section ? "block" : "none";
    });
    document.querySelectorAll(".sidebar-link").forEach((l) =>
      l.classList.toggle("active", l.dataset.section === section)
    );
    renderAll();
  }
  document.querySelectorAll(".sidebar-link").forEach((l) =>
    l.addEventListener("click", () => goTo(l.dataset.section))
  );
  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => goTo(b.dataset.go))
  );

  function renderAll() {
    renderDashboard();
    if (currentSection === "orders") renderOrders(document.getElementById("orderSearch").value);
    if (currentSection === "products") renderProducts();
    if (currentSection === "customers") renderCustomers();
  }
  window.addEventListener("reswork-products-updated", renderAll);
  window.addEventListener("reswork-orders-updated", () => {
    renderAll();
    if (window._adminSeenOrders !== undefined && Store.getOrders().length > window._adminSeenOrders) {
      showToast("New order received!");
    }
    window._adminSeenOrders = Store.getOrders().length;
  });

  /* ---------- DASHBOARD ---------- */
  function renderDashboard() {
    const orders = Store.getOrders();
    const products = Store.getProducts();
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const pending = orders.filter((o) => o.status === "Pending").length;
    const lowStock = products.filter((p) => (p.stock ?? 0) <= 5);

    document.getElementById("statGrid").innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">₹${revenue.toLocaleString("en-IN")}</div><div class="stat-trend">${orders.length} total orders</div></div>
      <div class="stat-card"><div class="stat-label">Pending Orders</div><div class="stat-value">${pending}</div><div class="stat-trend" style="color:var(--grey);">Needs action</div></div>
      <div class="stat-card"><div class="stat-label">Products Listed</div><div class="stat-value">${products.length}</div><div class="stat-trend" style="color:var(--grey);">${lowStock.length} low on stock</div></div>
      <div class="stat-card"><div class="stat-label">Units Sold</div><div class="stat-value">${orders.reduce((s,o)=>s+o.items.reduce((a,i)=>a+i.qty,0),0)}</div><div class="stat-trend" style="color:var(--grey);">Across all orders</div></div>
    `;

    const recentBody = document.querySelector("#recentOrdersTable tbody");
    const recent = orders.slice(0, 5);
    recentBody.innerHTML = recent.length
      ? recent.map(rowHtmlBasic).join("")
      : `<tr><td colspan="5" class="empty-row">No orders yet. Once a customer checks out, it'll show up here.</td></tr>`;

    const lowBody = document.querySelector("#lowStockTable tbody");
    lowBody.innerHTML = lowStock.length
      ? lowStock.map(p => `<tr><td>${p.name}</td><td>${p.category}</td><td style="color:#ff3c78;font-weight:700;">${p.stock}</td></tr>`).join("")
      : `<tr><td colspan="3" class="empty-row">All products are well stocked.</td></tr>`;
  }
  function rowHtmlBasic(o) {
    return `<tr><td><strong>${o.displayId || o.id}</strong></td><td>${o.customer?.name || "—"}</td><td>${o.items.length} item(s)</td><td>₹${o.total.toLocaleString("en-IN")}</td><td>${badge(o.status)}</td></tr>`;
  }

  /* ---------- ORDERS ---------- */
  function badge(status) {
    const cls = "badge-" + status.toLowerCase();
    return `<span class="badge ${cls}">${status}</span>`;
  }
  function renderOrders(filter = "") {
    const orders = Store.getOrders().filter(o =>
      (o.displayId || o.id).toLowerCase().includes(filter.toLowerCase()) ||
      (o.customer?.name || "").toLowerCase().includes(filter.toLowerCase())
    );
    const body = document.querySelector("#ordersTable tbody");
    body.innerHTML = orders.length
      ? orders.map(o => `
        <tr>
          <td><strong>${o.displayId || o.id}</strong></td>
          <td>${new Date(o.createdAt).toLocaleDateString()} ${new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
          <td>${o.customer?.name || "—"}</td>
          <td>${o.customer?.phone || "—"}</td>
          <td>${o.items.map(i => `${i.name} (${i.color}/${i.size}) x${i.qty}`).join("<br>")}</td>
          <td>₹${o.total.toLocaleString("en-IN")}<br><span style="font-size:.72rem;color:var(--grey);">${o.paymentMethod || "—"}${o.paymentId ? `<br>${o.paymentId}` : ""}</span></td>
          <td>
            <select class="status-select" data-order="${o.id}">
              ${["Pending","Processing","Shipped","Delivered","Cancelled"].map(s => `<option ${s===o.status?'selected':''}>${s}</option>`).join("")}
            </select>
          </td>
          <td><button class="btn-sm" data-view-address="${o.id}">Address</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="8" class="empty-row">No orders found.</td></tr>`;

    body.querySelectorAll(".status-select").forEach(sel =>
      sel.addEventListener("change", async () => {
        await Store.updateOrderStatus(sel.dataset.order, sel.value);
        showToast(`Order updated to ${sel.value}`);
      })
    );
    body.querySelectorAll("[data-view-address]").forEach(b =>
      b.addEventListener("click", () => {
        const o = Store.getOrders().find(x => x.id === b.dataset.viewAddress);
        alert(`Delivery Address for ${o.displayId || o.id}:\n\n${o.customer?.address || "Not provided"}`);
      })
    );
  }
  document.getElementById("orderSearch").addEventListener("input", (e) => renderOrders(e.target.value));

  /* ---------- PRODUCTS ---------- */
  function renderProducts() {
    const products = Store.getProducts();
    const body = document.querySelector("#productsTable tbody");
    body.innerHTML = products.length ? products.map(p => `
      <tr>
        <td><div class="cell-product"><img src="${p.images?.[0] || ''}" alt=""><span>${p.name}</span></div></td>
        <td>${p.category}</td>
        <td>₹${p.price.toLocaleString("en-IN")}</td>
        <td style="${p.stock<=5?'color:#ff3c78;font-weight:700;':''}">${p.stock}</td>
        <td>${p.tag || "—"}</td>
        <td style="display:flex;gap:8px;">
          <button class="btn-sm" data-edit="${p.id}">Edit</button>
          <button class="btn-sm btn-danger" data-delete="${p.id}">Delete</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty-row">No products yet. Click "+ Add Product" or "Load Sample Products" to get started.</td></tr>`;

    body.querySelectorAll("[data-edit]").forEach(b =>
      b.addEventListener("click", () => openProductModal(Store.getProduct(b.dataset.edit)))
    );
    body.querySelectorAll("[data-delete]").forEach(b =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete this product?")) return;
        await Store.deleteProduct(b.dataset.delete);
        showToast("Product deleted");
      })
    );
  }

  document.getElementById("seedProductsBtn").addEventListener("click", async () => {
    if (Store.getProducts().length > 0 && !confirm("This adds sample products on top of your existing ones. Continue?")) return;
    showToast("Loading sample products...");
    await Store.seedSampleProducts(SAMPLE_PRODUCTS);
    showToast("Sample products loaded!");
  });

  const productModal = document.getElementById("productModal");
  const productForm = document.getElementById("productForm");
  document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
  document.querySelectorAll("[data-close-product-modal]").forEach(b =>
    b.addEventListener("click", () => productModal.classList.remove("open"))
  );

  function openProductModal(product) {
    document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add Product";
    productForm.reset();
    productForm.id.value = product?.id || "";
    if (product) {
      productForm.name.value = product.name;
      productForm.category.value = product.category;
      productForm.price.value = product.price;
      productForm.stock.value = product.stock;
      productForm.tag.value = product.tag || "";
      productForm.colors.value = (product.colors || []).join(", ");
      productForm.sizes.value = (product.sizes || []).join(", ");
      productForm.image1.value = product.images?.[0] || "";
      productForm.image2.value = product.images?.[1] || "";
      productForm.description.value = product.description || "";
    }
    productModal.classList.add("open");
  }

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = productForm;
    const saveBtn = f.querySelector("button[type=submit]");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;
    try {
      let image1 = f.image1.value.trim();
      let image2 = f.image2.value.trim();
      if (f.imageFile1.files[0]) image1 = await Store.uploadProductImage(f.imageFile1.files[0]);
      if (f.imageFile2.files[0]) image2 = await Store.uploadProductImage(f.imageFile2.files[0]);
      if (!image1) { showToast("Please add at least one image (URL or upload)"); return; }

      const data = {
        name: f.name.value.trim(),
        category: f.category.value.trim(),
        price: Number(f.price.value),
        stock: Number(f.stock.value),
        tag: f.tag.value.trim() || "NEW",
        colors: f.colors.value.split(",").map(s => s.trim()).filter(Boolean),
        sizes: f.sizes.value.split(",").map(s => s.trim()).filter(Boolean),
        images: [image1, image2 || image1],
        description: f.description.value.trim(),
      };
      if (f.id.value) {
        await Store.updateProduct(f.id.value, data);
      } else {
        await Store.addProduct(data);
      }
      productModal.classList.remove("open");
      showToast("Product saved");
    } catch (err) {
      console.error(err);
      showToast("Save failed — check your Firebase setup");
    } finally {
      saveBtn.textContent = "Save Product";
      saveBtn.disabled = false;
    }
  });

  /* ---------- CUSTOMERS (derived from orders) ---------- */
  function renderCustomers() {
    const orders = Store.getOrders();
    const map = {};
    orders.forEach(o => {
      const key = (o.customer?.phone || o.customer?.name || "unknown");
      if (!map[key]) map[key] = { ...o.customer, orders: 0, spent: 0 };
      map[key].orders += 1;
      map[key].spent += o.total;
    });
    const list = Object.values(map);
    const body = document.querySelector("#customersTable tbody");
    body.innerHTML = list.length
      ? list.map(c => `
        <tr>
          <td>${c.name || "—"}</td>
          <td>${c.phone || "—"}</td>
          <td>${c.address || "—"}</td>
          <td>${c.orders}</td>
          <td>₹${c.spent.toLocaleString("en-IN")}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="empty-row">No customers yet.</td></tr>`;
  }

  /* ---------- init ---------- */
  goTo("dashboard");
}

/* ---------- sample data used by "Load Sample Products" ---------- */
const SAMPLE_PRODUCTS = [
  { id: "rw-001", name: "Oversized Tonal Hoodie", category: "Hoodies", price: 2499, colors: ["Black","Grey","White"], sizes: ["S","M","L","XL"], stock: 24,
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&q=80","https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=900&q=80"],
    description: "Heavyweight cotton fleece, dropped shoulder, boxy fit.", tag: "BESTSELLER" },
  { id: "rw-002", name: "Studio Cargo Pants", category: "Bottoms", price: 2899, colors: ["Black","Charcoal"], sizes: ["28","30","32","34","36"], stock: 18,
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900&q=80","https://images.unsplash.com/photo-1602293589930-45821b8b8a72?w=900&q=80"],
    description: "Six-pocket utility cargo with a tapered leg.", tag: "NEW" },
  { id: "rw-003", name: "Mono Crewneck Tee", category: "T-Shirts", price: 1199, colors: ["White","Black","Grey"], sizes: ["S","M","L","XL"], stock: 40,
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80","https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900&q=80"],
    description: "200gsm combed cotton, garment-dyed.", tag: "ESSENTIAL" },
  { id: "rw-004", name: "Liquid Bomber Jacket", category: "Outerwear", price: 4599, colors: ["Black","Steel Grey"], sizes: ["M","L","XL"], stock: 9,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&q=80","https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=900&q=80"],
    description: "Water-resistant shell with a satin liner.", tag: "LIMITED" },
  { id: "rw-005", name: "Grid Track Jacket", category: "Outerwear", price: 3299, colors: ["Grey","Black"], sizes: ["S","M","L","XL"], stock: 15,
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=80","https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=900&q=80"],
    description: "Full-zip track jacket with tonal grid stitching.", tag: "NEW" },
  { id: "rw-006", name: "Wide Denim Jeans", category: "Bottoms", price: 2699, colors: ["Washed Black","Stone Grey"], sizes: ["28","30","32","34"], stock: 21,
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=80","https://images.unsplash.com/photo-1475178626620-a4d074967452?w=900&q=80"],
    description: "Rigid selvedge denim in a wide straight leg.", tag: "BESTSELLER" },
];
