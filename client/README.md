# Patch Management System

A React-based patch management application with role-based authentication.

## Features

- **Role-based Authentication**: Different dashboards for admin and regular users
- **Routing**: Proper route-based navigation with React Router
  - `/login` - Login page
  - `/admin` - Admin dashboard (protected)
  - `/home` - User homepage (protected)
- **Persistent Sessions**: User sessions are stored in localStorage
- **Protected Routes**: Authenticated routes with automatic redirects
- **Responsive Design**: Built with Tailwind CSS for mobile and desktop
- **Modern UI**: Clean, professional interface with gradients and icons

## Demo Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full admin dashboard with system management controls

### Regular User Access
- **Username**: `user`
- **Password**: `user123`
- **Access**: User homepage with personal system management

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── LoginPage.jsx       # Login page at /login route
│   ├── AdminDashboard.jsx  # Admin dashboard at /admin route
│   ├── HomePage.jsx        # Regular user homepage at /home route
│   └── ProtectedRoute.jsx  # Route protection wrapper
├── data/
│   └── credentials.js      # User credentials and authentication logic
├── App.jsx                 # Main app with route configuration
├── App.css                 # App-specific styles
├── index.css              # Global styles with Tailwind
└── main.jsx               # App entry point
```

## Technologies Used

- React 19.2.0
- React Router DOM 7.1.1
- Vite 7.2.2
- Tailwind CSS 4.1.17
- ESLint for code quality

## Features by Role

### Admin Dashboard
- System statistics overview
- Critical updates monitoring
- Compliance rate tracking
- Admin controls (user management, settings, logs)
- Recent activity feed

### User Homepage
- Personal system overview
- Available updates list
- System status table
- Quick update actions

## Authentication Flow

1. User visits the website and is redirected to `/login`
2. User enters credentials on login page
3. Credentials are validated against stored user data
4. Successful login redirects to:
   - `/admin` for admin users
   - `/home` for regular users
5. Session is stored in localStorage for persistence
6. Protected routes check authentication before allowing access
7. Logout clears session and redirects to `/login`
