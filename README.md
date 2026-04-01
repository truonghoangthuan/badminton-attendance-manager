# 🏸 Badminton Attendance Manager

A premium, modern web application for managing badminton groups, session attendance, and financials. Built with a focus on visual excellence and seamless user experience.

![Glassmorphism Design](https://img.shields.io/badge/Design-Glassmorphism-blueviolet?style=for-the-badge)
![Nuxt 4](https://img.shields.io/badge/Framework-Nuxt%204-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

- **🛡️ Admin Dashboard**: Comprehensive management of badminton sessions and team roster.
- **🗳️ Public RSVP System**: Easy-to-use session signup for players with identity persistence.
- **💰 Financial Tracking**: Automated calculation of per-person costs based on court fees and shuttlecock usage.
- **👤 Roster Management**: Maintain a list of regular members and their active status.
- **🌑 Dark/Light Mode**: Full support for system-aware color modes with a stunning glassmorphic aesthetic.
- **📱 Responsive Design**: Optimized for both mobile and desktop use.

## 🛠️ Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Backend Service**: [Firebase](https://firebase.google.com/) (Firestore & Auth)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Typography**: Plus Jakarta Sans

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm / pnpm / yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd badminton-attendance-manager-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add your Firebase credentials (see `.env.example`):
   ```env
   NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   # ... and other Firebase variables
   ```

### Development

Start the development server:
```bash
npm run dev
```

### Build

Build the application for production:
```bash
npm run build
```

## 📂 Project Structure (Nuxt 4)

This project follows the Nuxt 4 directory structure:
- `app/`: Contains the main application code (pages, components, layouts, etc.)
- `public/`: Static assets.
- `server/`: Server-side logic (if any).

---

Built with ❤️ for the Badminton Community.
