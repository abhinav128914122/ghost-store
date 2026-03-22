# Abhinav's Market 🛒

A simulated marketplace with a fake banking system built using vanilla HTML/CSS/JS, Supabase, and Vercel.

> No real money. No real payments. 100% real code.

---

## 🌐 Live Site

[abhinavs-market.vercel.app]([https://ghost-store-seven.vercel.app](https://ghost-store-seven.vercel.app/))

---

## 🛠️ Built With

- **HTML + CSS + JavaScript** — entire frontend in a single file, no frameworks
- **Supabase** — PostgreSQL database storing all accounts, products, orders, transactions
- **Vercel** — hosting and serverless API routes (keeps Supabase key hidden from browser)

---

## ✨ What It Does

### Buyers
- Browse and search products by category
- Sort by price, rating, or popularity
- Buy using ZeroBank (fake bank with real balance deduction)
- Apply coupon codes at checkout
- Add to wishlist, view orders, write reviews
- Top up balance, view transaction history

### Sellers
- Seller dashboard with revenue, orders, product stats
- Add, pause, delete product listings
- Set sale prices (shows crossed-out original price)
- Update order status (confirmed → shipped → delivered)
- Get notifications on every new order

### New Users
- Create a ZeroBank account in 3 steps
- Choose Buyer or Seller role
- Get ₹10,000 free starter balance on signup

---

## 🗄️ Database Tables

| Table | What it stores |
|-------|---------------|
| bank_accounts | Account number, name, balance, PIN |
| profiles | Role (buyer/seller), store name, bio |
| products | Listings with price, stock, images, ratings |
| orders | Every purchase with buyer and seller info |
| transactions | Full debit/credit history |
| reviews | Star ratings and comments |
| wishlist | Saved products per user |
| notifications | Order alerts for sellers |
| coupons | Discount codes |
| wallet_topups | Top-up history |

---

## 🎮 Demo Accounts

All PINs are **1234**

| Account | Name | Role |
|---------|------|------|
| ZERO001 | Abhinav | Buyer |
| ZERO002 | Vyomi | Buyer |
| ZERO003 | Vaibhav | Buyer |
| ZERO004 | Navya | Buyer |
| SELLER1 | TechWorld Store | Seller |
| SELLER2 | FashionHub | Seller |
| SELLER3 | BookNest | Seller |

**Coupon codes:** `WELCOME10` · `SAVE20` · `ABHINAV50`

---

## 🔐 Security

- Supabase key stored in Vercel Environment Variables — never in code
- PIN verified server-side via Vercel API routes
- PIN never sent back to browser after login

---

## 👨‍💻 Made By

**Abhinav** — built in a single day with guidance from Claude AI.
