# InvoiceFlow 💎
### **Elite Freelance Invoicing & Automated Payment Reminders**

InvoiceFlow is a premium invoicing platform designed for the modern freelancer. We transform the friction of billing into a high-converting, professional experience. Create branded invoices in seconds, send them via Resend, and get paid instantly via Stripe Checkout.

---

## ✨ Core Pillars

*   **🎨 Premium Branded Invoicing**: Generate world-class PDF invoices with modern, glassmorphic designs that elevate your brand perception.
*   **🤖 Intelligent Reminders**: Smart automatic reminders via email (Resend) to ensure you get paid on time without the awkward chasing.
*   **⚡ Stripe Checkout Integration**: Frictionless Stripe payment sessions built into every invoice for maximum conversion.
*   **📊 Executive Dashboard**: Track your earnings, pending invoices, and client activity with high-fidelity charts.
*   **🛡️ Secure & Reliable**: Built with React 19, Node.js, and BullMQ for robust background processing.
*   **🌐 Global & Local**: Native support for USD ($) and INR (₹), designed for freelancers working across borders.

---

## 🛠️ High-Performance Tech Stack

| Layer | Technology |
| :--- | :--- |
| **API Core** | Node.js, Express, Prisma (ORM) |
| **Background Jobs** | BullMQ, Redis (Upstash) |
| **Frontend** | React 19, Vite, Tailwind CSS 4, Framer Motion |
| **Email Delivery** | Resend (Verified for getinvoiceflow.fun) |
| **Payment Engine** | Stripe Checkout (Test & Live Mode) |
| **Persistence** | Neon Postgres (Serverless) |

---

## 🚀 Getting Started

### **Local Development**
1.  **Clone & Initialize**:
    ```bash
    git clone https://github.com/sidsri14/invoiceflow.git
    cd invoiceflow
    cd backend && npm install
    cd ../frontend && npm install
    ```
2.  **Environment Setup**:
    Configure `backend/.env` with your `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, and `DATABASE_URL`.
3.  **Launch the System**:
    - **Back-end API**: `cd backend && npm run dev`
    - **Background Worker**: `cd backend && npm run worker`
    - **Frontend Dashboard**: `cd frontend && npm run dev`

### **Deployment**
*   **Frontend**: Professional-grade deployment on **Vercel**.
*   **Core API & Workers**: Scalable deployment on **Railway**.

---

## 📈 Roadmap
- [x] Public Demo Generator (No Auth)
- [x] Automatic Email Reminders
- [x] Static HTML Landing Page (SEO)
- [ ] AI-Powered Invoice Descriptions
- [ ] Multi-currency Auto-conversion
- [ ] Team Collaboration Features

---

## ⚖️ License
MIT License. Crafted with precision for freelancers who demand the best.
