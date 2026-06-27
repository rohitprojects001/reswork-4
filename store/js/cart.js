/* =========================================================
   RESWORK — shared UI behaviors (navbar, cart drawer, toast,
   checkout modal, scroll reveals). Included on every page.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- navbar shrink on scroll ---------- */
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 40);
    });
  }

  /* ---------- mobile nav toggle ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
    navLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => navLinks.classList.remove("open"))
    );
  }

  /* ---------- cart badge ---------- */
  function refreshCartBadge() {
    const badge = document.querySelector(".cart-badge");
    if (badge) badge.textContent = Store.cartCount();
  }
  refreshCartBadge();
  window.addEventListener("reswork-cart-updated", refreshCartBadge);

  /* ---------- cart drawer ---------- */
  const cartDrawer = document.querySelector(".cart-drawer");
  const cartOverlay = document.querySelector(".cart-overlay");
  const cartOpenBtns = document.querySelectorAll("[data-open-cart]");
  const cartCloseBtns = document.querySelectorAll("[data-close-cart]");

  function renderCartDrawer() {
    if (!cartDrawer) return;
    const itemsBox = cartDrawer.querySelector(".cart-items");
    const totalBox = cartDrawer.querySelector(".cart-total-value");
    const cart = Store.getCart();
    if (!cart.length) {
      itemsBox.innerHTML = `<div class="cart-empty">Your bag is empty.<br>Go find something good.</div>`;
    } else {
      itemsBox.innerHTML = cart
        .map(
          (item, i) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-info">
            <div class="ci-name">${item.name}</div>
            <div class="ci-meta">${item.color} · ${item.size}</div>
            <div class="cart-item-row">
              <div class="qty-control" style="transform:scale(.85);transform-origin:left;">
                <button data-qty-down="${i}">−</button>
                <span>${item.qty}</span>
                <button data-qty-up="${i}">+</button>
              </div>
              <span>₹${(item.price * item.qty).toLocaleString("en-IN")}</span>
            </div>
            <button class="remove-btn" data-remove="${i}">Remove</button>
          </div>
        </div>`
        )
        .join("");
    }
    if (totalBox) totalBox.textContent = "₹" + Store.cartTotal().toLocaleString("en-IN");

    itemsBox.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => {
        Store.removeFromCart(+b.dataset.remove);
        renderCartDrawer();
      })
    );
    itemsBox.querySelectorAll("[data-qty-up]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.qtyUp;
        Store.updateCartQty(i, Store.getCart()[i].qty + 1);
        renderCartDrawer();
      })
    );
    itemsBox.querySelectorAll("[data-qty-down]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.qtyDown;
        const cur = Store.getCart()[i].qty;
        if (cur <= 1) { Store.removeFromCart(i); } else { Store.updateCartQty(i, cur - 1); }
        renderCartDrawer();
      })
    );
  }

  function openCart() {
    renderCartDrawer();
    cartDrawer?.classList.add("open");
    cartOverlay?.classList.add("open");
  }
  function closeCart() {
    cartDrawer?.classList.remove("open");
    cartOverlay?.classList.remove("open");
  }
  cartOpenBtns.forEach((b) => b.addEventListener("click", openCart));
  cartCloseBtns.forEach((b) => b.addEventListener("click", closeCart));
  cartOverlay?.addEventListener("click", closeCart);
  window.addEventListener("reswork-cart-updated", () => {
    if (cartDrawer?.classList.contains("open")) renderCartDrawer();
  });

  /* ---------- checkout modal ---------- */
  const checkoutOpenBtn = document.querySelector("[data-open-checkout]");
  const modalOverlay = document.querySelector(".modal-overlay");
  const checkoutForm = document.querySelector("#checkoutForm");

  checkoutOpenBtn?.addEventListener("click", () => {
    if (!Store.getCart().length) {
      showToast("Your bag is empty");
      return;
    }
    closeCart();
    modalOverlay.classList.add("open");
    modalOverlay.querySelector(".checkout-view").style.display = "block";
    modalOverlay.querySelector(".success-view").style.display = "none";
  });
  modalOverlay?.querySelectorAll("[data-close-modal]").forEach((b) =>
    b.addEventListener("click", () => modalOverlay.classList.remove("open"))
  );
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove("open");
  });

  checkoutForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const customer = {
      name: checkoutForm.name.value,
      phone: checkoutForm.phone.value,
      address: checkoutForm.address.value,
    };
    const submitBtn = checkoutForm.querySelector("button[type=submit]");

    if (!window.RAZORPAY_CONFIGURED) {
      showToast("Payment not configured yet — see shared/razorpay-config.js");
      return;
    }

    const amountInPaise = Math.round(Store.cartTotal() * 100);
    submitBtn.textContent = "Opening payment...";
    submitBtn.disabled = true;

    const rzp = new Razorpay({
      key: window.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: "INR",
      name: window.STORE_DETAILS?.name || "RESWORK",
      description: window.STORE_DETAILS?.description || "Order Payment",
      prefill: {
        name: customer.name,
        contact: customer.phone,
      },
      theme: { color: window.STORE_DETAILS?.themeColor || "#0a0a0a" },
      handler: async function (response) {
        submitBtn.textContent = "Placing order...";
        try {
          const order = await Store.placeOrder(customer, response);
          if (order) {
            modalOverlay.querySelector(".checkout-view").style.display = "none";
            const successView = modalOverlay.querySelector(".success-view");
            successView.style.display = "block";
            successView.querySelector(".order-id").textContent = order.displayId || order.id;
            checkoutForm.reset();
            refreshCartBadge();
          }
        } catch (err) {
          console.error(err);
          showToast("Payment succeeded but saving order failed — contact support with payment ID " + response.razorpay_payment_id);
        } finally {
          submitBtn.textContent = "Pay & Place Order";
          submitBtn.disabled = false;
        }
      },
      modal: {
        ondismiss: function () {
          submitBtn.textContent = "Pay & Place Order";
          submitBtn.disabled = false;
          showToast("Payment cancelled");
        },
      },
    });

    rzp.on("payment.failed", function () {
      showToast("Payment failed — please try again");
      submitBtn.textContent = "Pay & Place Order";
      submitBtn.disabled = false;
    });

    rzp.open();
  });

  /* ---------- toast ---------- */
  window.showToast = function (msg) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  /* ---------- scroll reveal (replays every time it enters view) ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        e.target.classList.toggle("is-visible", e.isIntersecting);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---------- product quick-add (event delegation, works on grid cards) ---------- */
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quickadd]");
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.quickadd;
    const product = Store.getProduct(id);
    if (!product) return;
    Store.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      color: product.colors[0],
      size: product.sizes[0],
      qty: 1,
    });
    showToast(`${product.name} added to bag`);
  });
});
