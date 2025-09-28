# Echo Chat Frontend

A modern React-based frontend for the Echo Chat application with beautiful UI and theme support.

## Features

- **React Components** - Modular component architecture
- **Authentication** - Login and registration with demo credentials
- **Dashboard** - Tabbed interface with Overview, Chat, AI Tools, Settings
- **Theme System** - Dark/light mode with persistent preferences
- **Responsive Design** - Works on all devices
- **Glass Morphism Effects** - Modern UI design
- **Form Validation** - Client-side validation with error handling

## Quick Start

### Development
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Access Your App

- **Login Page:** http://localhost:5173/
- **Register Page:** http://localhost:5173/register
- **Dashboard:** http://localhost:5173/dashboard

## Demo Credentials

- **Email:** alice@example.com
- **Password:** StrongPass123!

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Context API** - State management

## Port Configuration

The frontend runs on **port 5173** by default. This is configured in:
- `vite.config.js` - Vite configuration
- `package.json` - npm scripts
