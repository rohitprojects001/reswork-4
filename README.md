# RESWORK — E‑commerce Website (Store + Admin Portal)

## 📁 Folder Structure
```
reswork/
├── store/                     ← Customer-facing website
│   ├── index.html             ← Homepage (hero + scroll story + featured products)
│   ├── store.html             ← Full catalog with search + filters
│   ├── product.html           ← Single product page (gallery, add to cart, buy now)
│   ├── css/style.css          ← All styling (theme, navbar, animations)
│   ├── js/data.js             ← "Database" — products, cart, orders (localStorage)
│   ├── js/cart.js             ← Cart drawer, checkout modal, toasts, scroll reveals
│   └── assets/                ← PUT YOUR LOGO HERE as "logo.png"
│
├── admin/                     ← Admin portal (you only)
│   ├── index.html             ← Login + Dashboard + Orders + Products + Customers
│   ├── css/admin.css
│   └── js/admin.js
│   └── js/data.js             ← same data layer, copied here so admin works standalone
```

## 🚀 How to run it
1. Drop your logo file into `store/assets/logo.png` (and optionally `admin/`).
2. Open `store/index.html` in a browser — that's your live storefront.
   (Best opened through a local server, not double-click, so localStorage behaves — e.g. VS Code's "Live Server" extension, or run `npx serve` inside the `reswork` folder.)
3. Browse → Search → Open a product → Add to Cart / Buy Now → Checkout.
4. Open `admin/index.html` (same browser, same server) to see the order land instantly.

## 🔑 Admin Login
- Username: `admin`
- Password: `reswork123`
(Change these in `admin/js/admin.js` → `ADMIN_CREDS` near the top.)

## 💳 Payment Setup (Razorpay)
Customers pay via UPI/Card/Netbanking at checkout. To activate:
1. Sign up free at [dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Make sure you're in **Test Mode** (toggle top-left of dashboard)
3. Go to **Settings → API Keys → Generate Test Key**
4. Copy the **Key Id** (starts with `rzp_test_...`)
5. Open `shared/razorpay-config.js` and paste it in place of `PASTE_YOUR_RAZORPAY_KEY_ID_HERE`

**Test the payment flow** (test mode, no real money moves) using these fake card details at checkout:
- Card number: `4111 1111 1111 1111`
- Any future expiry date, any CVV, any name
- For UPI testing, use `success@razorpay` as the UPI ID

When ready to take **real** payments: complete Razorpay's KYC (1–2 days), switch to Live Mode,
generate a Live key (`rzp_live_...`), and swap it into the same config file. Nothing else changes.

⚠️ Note: this client-side integration is great for getting started fast, but for a fully
production-grade setup (server-side payment verification so payment status can never be faked),
add a small backend step later using **Razorpay Webhooks** or a **Firebase Cloud Function** —
happy to help set that up when you're ready to go fully live.

## 📱 Mobile
The whole site (store + admin) is responsive — navbar collapses into a dropdown menu,
product grid becomes 2 columns, admin sidebar becomes a horizontal scroll bar, and all
modals/forms resize to fit small screens.

## ⚠️ Important — read this
This build uses your **browser's localStorage** as the database so the Store and Admin Portal
talk to each other live, with zero backend setup. That means:
- It works perfectly for **demoing, testing, and showing clients** on one machine/browser.
- For a **real public store** (customers on their own phones placing real orders that
  reach your admin from anywhere), you'll need a real backend + database (e.g. Node.js +
  MongoDB/Postgres, or a service like Firebase/Supabase) so data isn't stuck in one browser.
  The code is already structured so swapping `js/data.js`'s localStorage calls for real
  API calls (`fetch('/api/orders')` etc.) is a clean, contained change — nothing else needs touching.

## 🎨 What's included
- **Theme:** black / charcoal / grey / white, with a subtle animated RGB wash and an
  RGB liquid-glass navbar (conic-gradient border that spins continuously).
- **Homepage:** giant outline wordmark hero with a cycling "look stage", and a
  scroll-driven section where the outfit photo changes as you scroll (sticky frame technique).
- **Store page:** search bar + category filter chips + animated product grid with
  image-swap-on-hover and a quick-add button.
- **Product page:** image gallery, color/size swatches, quantity stepper, Add to Cart
  / Buy Now, accordion for delivery & care info, related products.
- **Cart drawer + checkout modal:** slides in from the right, collects name/phone/address,
  places the order, shows an animated success state with an order ID.
- **Admin portal:** login gate, dashboard with revenue/orders/stock stats, full orders
  table with live status updates (Pending → Processing → Shipped → Delivered), product
  manager (add/edit/delete + stock), and a customers list derived from orders.

## ✏️ Easy edits
- Add/remove products: easiest from the **Admin → Products** page itself (no code needed).
- Change colors: edit the `:root` variables at the top of `store/css/style.css` and `admin/css/admin.css`.
- Change fonts: the `@import` line at the top of each CSS file.
