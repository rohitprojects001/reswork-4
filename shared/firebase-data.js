/* =========================================================
   RESWORK — Firebase data layer
   Products + Orders live in Firestore (synced across every
   device, in real time). Cart stays in this browser's
   localStorage until checkout — that's normal for any store.
   ========================================================= */

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const CONFIGURED = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_YOUR");

let app, db, storage;
if (CONFIGURED) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  console.warn(
    "RESWORK: Firebase is not configured yet. Fill in shared/firebase-config.js with your project keys."
  );
}

const CART_KEY = "reswork_cart";

let _products = [];
let _orders = [];
let _ready = { products: false, orders: false };

function announceReadyIfDone() {
  if (_ready.products && _ready.orders) {
    window.dispatchEvent(new Event("reswork-db-ready"));
  }
}

function startListeners() {
  if (!CONFIGURED) {
    window.dispatchEvent(new Event("reswork-db-unconfigured"));
    return;
  }
  onSnapshot(collection(db, "products"), (snap) => {
    _products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _ready.products = true;
    window.dispatchEvent(new Event("reswork-products-updated"));
    announceReadyIfDone();
  }, (err) => console.error("Products listener error:", err));

  onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
    _orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _ready.orders = true;
    window.dispatchEvent(new Event("reswork-orders-updated"));
    announceReadyIfDone();
  }, (err) => console.error("Orders listener error:", err));
}
startListeners();

export const Store = {
  isConfigured() { return CONFIGURED; },

  /* ---------- PRODUCTS (Firestore, real-time, all devices) ---------- */
  getProducts() {
    return _products;
  },
  getProduct(id) {
    return _products.find((p) => p.id === id);
  },
  async addProduct(data) {
    await addDoc(collection(db, "products"), data);
  },
  async updateProduct(id, data) {
    await updateDoc(doc(db, "products", id), data);
  },
  async deleteProduct(id) {
    await deleteDoc(doc(db, "products", id));
  },
  async updateStock(id, qtyChange) {
    const p = this.getProduct(id);
    if (!p) return;
    const newStock = Math.max(0, (p.stock || 0) + qtyChange);
    await updateDoc(doc(db, "products", id), { stock: newStock });
  },
  async uploadProductImage(file) {
    const path = `products/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  },
  async seedSampleProducts(sampleArray) {
    for (const p of sampleArray) {
      const { id, ...rest } = p;
      await setDoc(doc(db, "products", id), rest);
    }
  },

  /* ---------- CART (per-device, localStorage — normal for any store) ---------- */
  getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  },
  saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("reswork-cart-updated"));
  },
  addToCart(item) {
    const cart = this.getCart();
    const existing = cart.find(
      (c) => c.id === item.id && c.size === item.size && c.color === item.color
    );
    if (existing) existing.qty += item.qty;
    else cart.push(item);
    this.saveCart(cart);
  },
  removeFromCart(index) {
    const cart = this.getCart();
    cart.splice(index, 1);
    this.saveCart(cart);
  },
  updateCartQty(index, qty) {
    const cart = this.getCart();
    if (cart[index]) cart[index].qty = Math.max(1, qty);
    this.saveCart(cart);
  },
  clearCart() { this.saveCart([]); },
  cartTotal() { return this.getCart().reduce((s, c) => s + c.price * c.qty, 0); },
  cartCount() { return this.getCart().reduce((s, c) => s + c.qty, 0); },

  /* ---------- ORDERS (Firestore, real-time — admin sees instantly) ---------- */
  getOrders() {
    return _orders;
  },
  async placeOrder(customer, payment = null) {
    const cart = this.getCart();
    if (!cart.length) return null;
    const total = this.cartTotal();
    const orderData = {
      displayId: "RW-" + Date.now().toString().slice(-8),
      items: cart,
      total,
      customer,
      status: payment ? "Processing" : "Pending",
      paymentMethod: payment ? "Online (Razorpay)" : "Cash on Delivery",
      paymentId: payment?.razorpay_payment_id || null,
      paid: !!payment,
      createdAt: Date.now(),
    };
    const docRef = await addDoc(collection(db, "orders"), orderData);
    for (const item of cart) {
      await this.updateStock(item.id, -item.qty);
    }
    this.clearCart();
    return { id: docRef.id, ...orderData };
  },
  async updateOrderStatus(orderId, status) {
    await updateDoc(doc(db, "orders", orderId), { status });
  },
};

window.Store = Store;
window.RESWORK_FIREBASE_CONFIGURED = CONFIGURED;
