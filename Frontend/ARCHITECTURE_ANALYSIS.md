# 🏗️ Swasthya Repository Architecture & Design Flow Analysis

## 📋 Table of Contents
1. [Repository Structure](#repository-structure)
2. [Architecture Overview](#architecture-overview)
3. [Design Patterns](#design-patterns)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [Database Design](#database-design)
10. [Component Hierarchy](#component-hierarchy)

---

## 📁 Repository Structure

### High-Level Organization
```
Swasthya-India-s-Decentralized-Health-Intelligence-Network/
├── frontend/          # React + TypeScript Frontend Application
├── backend/          # Node.js + Express Backend API
├── docker-compose.yml # Container orchestration
└── Documentation/    # Project documentation
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # Base UI components (shadcn/ui style)
│   │   ├── layout/     # Layout components (Navbar, Sidebar, DashboardLayout)
│   │   └── ProtectedRoute.tsx
│   ├── contexts/       # React Context providers (Auth, Theme)
│   ├── hooks/          # Custom React Query hooks
│   ├── lib/            # Utilities and API clients
│   │   └── api/        # API client, endpoints, mock data
│   ├── pages/          # Page components (route-level)
│   └── App.tsx         # Main routing configuration
├── public/             # Static assets
└── Configuration files (vite, tailwind, tsconfig)
```

### Backend Structure
```
backend/
├── config/             # Configuration (database)
├── database/           # SQL schema and initialization
├── middleware/        # Express middleware (auth)
├── routes/            # API route handlers
│   ├── auth.js       # Authentication endpoints
│   ├── dashboard.js  # Dashboard data endpoints
│   └── scheduling.js # Admin scheduling endpoints
├── scripts/           # Utility scripts (DB init, testing)
└── server.js         # Express server setup
```

---

## 🏛️ Architecture Overview

### Architecture Type: **Layered Architecture + Microservices Pattern**

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Frontend - Pages, Components, Hooks)            │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│                   Application Layer                      │
│  (Express Backend - Routes, Middleware, Controllers)     │
└────────────────────┬────────────────────────────────────┘
                     │ SQL Queries
┌────────────────────▼────────────────────────────────────┐
│                    Data Layer                            │
│  (PostgreSQL Database - Tables, Relations)              │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**
   - Frontend handles UI/UX and client-side logic
   - Backend handles business logic and data persistence
   - Database handles data storage and relationships

2. **Role-Based Access Control (RBAC)**
   - Three-tier role system: Patient, Hospital, Super Admin
   - Route-level and component-level protection
   - Backend middleware authorization

3. **API-First Design**
   - RESTful API endpoints
   - Type-safe API clients
   - Mock data for development

4. **Progressive Enhancement**
   - Fallback to mock data when services unavailable
   - Graceful error handling
   - CORS-aware error management

---

## 🎨 Design Patterns

### 1. **Context Pattern** (React Context API)
- **AuthContext**: Manages authentication state globally
- **ThemeContext**: Manages theme preferences
- **Usage**: Provides state to all components without prop drilling

### 2. **Custom Hooks Pattern** (React Query)
- **useForecast**, **useTriage**, **useStaff**, etc.
- **Purpose**: Encapsulates data fetching logic with caching
- **Benefits**: Reusability, automatic refetching, error handling

### 3. **Repository Pattern** (API Layer)
- **client.ts**: Axios instances for different services
- **endpoints.ts**: Centralized endpoint definitions
- **mock.ts**: Fallback data for development

### 4. **Middleware Pattern** (Express)
- **authenticateToken**: JWT verification
- **authorizeRole**: Role-based access control
- **Request logging**: Debugging and monitoring

### 5. **Protected Route Pattern**
- **ProtectedRoute Component**: Wraps routes requiring authentication
- **Role-based redirection**: Automatic navigation based on user role

### 6. **Factory Pattern** (API Clients)
- **createApiClient**: Factory function for creating Axios instances
- **Consistent configuration**: Auth interceptors, error handling

---

## 🔄 Data Flow

### Authentication Flow
```
User Input (Login/Register)
    ↓
Frontend Validation
    ↓
API Request (POST /api/auth/login)
    ↓
Backend Validation (Aadhaar, Password)
    ↓
Database Query (User lookup)
    ↓
JWT Token Generation
    ↓
Response (Token + User Data)
    ↓
LocalStorage Storage
    ↓
AuthContext Update
    ↓
Route Redirection (Role-based)
```

### Data Fetching Flow
```
Component Renders
    ↓
Custom Hook Called (e.g., useForecast)
    ↓
React Query Cache Check
    ↓
API Request (via endpoint function)
    ↓
Axios Interceptor (Adds Auth Token)
    ↓
Backend Middleware (Validates Token)
    ↓
Route Handler (Business Logic)
    ↓
Database Query
    ↓
Response Processing
    ↓
React Query Cache Update
    ↓
Component Re-render with Data
```

### Error Handling Flow
```
API Error Occurs
    ↓
Axios Interceptor Catches Error
    ↓
Error Type Detection (CORS, 401, Network)
    ↓
CORS Error → Silent handling (expected)
401 Error → Clear auth, redirect to login
Other Errors → Console log
    ↓
Hook Fallback (Mock data if available)
    ↓
Component Receives Fallback Data
```

---

## 🔒 Security Architecture

### Authentication Layers

1. **Frontend Security**
   - Token stored in localStorage
   - Protected routes check authentication
   - Role-based component rendering
   - Input validation (Aadhaar format, password length)

2. **Backend Security**
   - JWT token verification middleware
   - Password hashing (bcrypt)
   - Role-based authorization
   - SQL injection prevention (parameterized queries)

3. **API Security**
   - Bearer token authentication
   - CORS configuration
   - Request validation
   - Error message sanitization

### Security Flow
```
Request → CORS Check → Auth Middleware → Role Check → Route Handler
```

---

## 🌐 API Architecture

### API Client Structure

#### Multi-Client Architecture
```typescript
orchestratorApi    → Orchestrator service (port 3000)
forecastApi        → Forecast agent (port 8001)
staffApi           → Staff scheduling agent (port 8002)
erOrApi            → ER/OR agent (port 8003)
dischargeApi       → Discharge agent (port 8004)
triageApi          → Triage agent (port 8005)
flApi1, flApi2     → Federated Learning servers (8086, 8087)
backendApi         → Main backend (auth, dashboard)
```

### Endpoint Categories

1. **Auth Endpoints** (`/api/auth`)
   - `POST /login` - User authentication
   - `POST /register` - User registration
   - `GET /me` - Current user info

2. **Dashboard Endpoints** (`/api/dashboard`)
   - `GET /patient` - Patient dashboard data
   - `GET /hospital` - Hospital dashboard data
   - `GET /admin` - Admin dashboard data

3. **Scheduling Endpoints** (`/api/scheduling`)
   - `GET /hospitals` - List hospitals
   - `POST /assign` - Assign hospital
   - `GET /assignments` - Get assignments

4. **Agent Endpoints** (External services)
   - Forecast, Triage, Staff, ER/OR, Discharge agents
   - Each with health, predict, schedule endpoints

### API Design Principles

- **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **Type-Safe**: TypeScript interfaces for requests/responses
- **Consistent**: Uniform error handling and response format
- **Documented**: Endpoint definitions in endpoints.ts

---

## 💻 Frontend Architecture

### Component Hierarchy

```
App
├── QueryClientProvider (React Query)
├── ThemeProvider (Theme Context)
├── AuthProvider (Auth Context)
└── BrowserRouter
    └── Routes
        ├── Public Routes (CoverPage, Login, Register)
        └── Protected Routes
            ├── Patient Routes
            │   └── DashboardLayout
            │       └── PatientDashboard
            ├── Hospital Routes
            │   └── DashboardLayout
            │       ├── HospitalDashboard
            │       ├── DemandForecast
            │       ├── Triage
            │       ├── StaffScheduling
            │       ├── ERORScheduling
            │       ├── DischargePlanning
            │       └── FederatedLearning
            └── Admin Routes
                └── DashboardLayout
                    └── AdminDashboard
```

### State Management

1. **Global State** (React Context)
   - Authentication state (AuthContext)
   - Theme preferences (ThemeContext)

2. **Server State** (React Query)
   - API data caching
   - Automatic refetching
   - Optimistic updates

3. **Local State** (React useState)
   - Form inputs
   - UI toggles
   - Component-specific state

### Routing Strategy

- **Public Routes**: `/`, `/login`, `/register`
- **Role-Based Routes**: 
  - `/patient/*` - Patient access only
  - `/hospital/*` - Hospital access only
  - `/admin/*` - Super admin access only
- **Nested Routes**: Hospital routes use nested routing for sub-pages

---

## ⚙️ Backend Architecture

### Request Processing Pipeline

```
HTTP Request
    ↓
CORS Middleware
    ↓
Body Parser (JSON)
    ↓
Request Logger
    ↓
Route Matching
    ↓
Auth Middleware (if protected)
    ↓
Role Authorization (if required)
    ↓
Route Handler
    ↓
Database Query
    ↓
Response Formatter
    ↓
HTTP Response
```

### Route Organization

```
/api/auth          → Authentication operations
/api/dashboard     → Dashboard data retrieval
/api/scheduling    → Admin scheduling operations
/health            → Health check endpoint
```

### Database Connection

- **Connection Pool**: PostgreSQL connection pooling
- **Query Pattern**: Parameterized queries (SQL injection prevention)
- **Transaction Support**: For complex operations

---

## 🗄️ Database Design

### Entity Relationship Model

```
users (1) ──┬── (1) hospitals
            │
            └── (1) patients

hospitals (1) ── (N) patient_records
patients (1) ── (N) patient_records

hospitals (1) ── (N) hospital_assignments
users (1) ── (N) hospital_assignments (assigned_by)
```

### Table Relationships

1. **users** (Central entity)
   - One-to-One with `hospitals` or `patients`
   - Identified by `aadhaar_number` (unique)

2. **hospitals**
   - Linked to `users` via `user_id`
   - Can have multiple `patient_records`
   - Can have multiple `hospital_assignments`

3. **patients**
   - Linked to `users` via `user_id`
   - Can have multiple `patient_records`

4. **patient_records**
   - Many-to-One with `patients`
   - Many-to-One with `hospitals`
   - Represents medical records

5. **hospital_assignments**
   - Many-to-One with `hospitals`
   - Many-to-One with `users` (assigned_by)

### Data Integrity

- **Foreign Keys**: Cascade deletes
- **Unique Constraints**: Aadhaar numbers, user_id relationships
- **Check Constraints**: Role validation
- **Indexes**: On frequently queried columns

---

## 🔧 Technology Stack

### Frontend
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **React Query**: Server state management
- **Axios**: HTTP client
- **TailwindCSS**: Utility-first CSS
- **Recharts**: Data visualization
- **React Hot Toast**: Notifications

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **PostgreSQL**: Relational database
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **express-validator**: Input validation
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment configuration

### Development Tools
- **Docker**: Containerization
- **Nginx**: Production web server
- **Git**: Version control

---

## 📊 Design Flow Summary

### User Journey Flow

```
1. Landing Page (CoverPage)
   ↓
2. Login/Register
   ↓
3. Authentication
   ↓
4. Role-Based Dashboard
   ↓
5. Feature Access (Based on Role)
   - Patient: View records
   - Hospital: Manage operations
   - Admin: System management
```

### Application Initialization Flow

```
1. App.tsx loads
   ↓
2. Providers initialize (QueryClient, Theme, Auth)
   ↓
3. AuthContext checks localStorage for token
   ↓
4. Router renders based on auth state
   ↓
5. Protected routes check authentication
   ↓
6. Components fetch data via hooks
   ↓
7. API clients make requests with auth tokens
   ↓
8. Backend validates and processes
   ↓
9. Data flows back to components
   ↓
10. UI updates
```

### Error Recovery Flow

```
Error Detected
   ↓
Error Type Identified
   ↓
CORS Error → Use mock data (silent)
401 Error → Clear auth → Redirect to login
Network Error → Use mock data (warn)
Other Error → Log → Show error message
   ↓
Fallback Data Loaded
   ↓
UI Updated with Fallback
```

---

## 🎯 Key Design Decisions

1. **Multi-Agent Architecture**: Separate services for different AI agents
2. **Fallback Strategy**: Mock data ensures UI works even when services are down
3. **Type Safety**: TypeScript throughout for compile-time error detection
4. **Centralized API**: Single source of truth for endpoints
5. **Role-Based Routing**: Clear separation of user types
6. **Context-Based Auth**: Global authentication state management
7. **React Query**: Automatic caching and refetching
8. **Modular Components**: Reusable UI components
9. **Middleware Chain**: Consistent request processing
10. **Database Normalization**: Proper relational design

---

## 🚀 Scalability Considerations

### Current Architecture Supports:
- ✅ Horizontal scaling (stateless backend)
- ✅ Microservices integration (separate agent services)
- ✅ Database connection pooling
- ✅ Caching layer (React Query)
- ✅ Environment-based configuration

### Future Enhancements:
- 🔄 Redis for session management
- 🔄 Message queue for async operations
- 🔄 API gateway for service orchestration
- 🔄 Load balancing
- 🔄 Database replication
- 🔄 CDN for static assets

---

## 📝 Conclusion

The Swasthya repository follows a **well-structured, layered architecture** with:
- Clear separation between frontend and backend
- Role-based access control throughout
- Type-safe API communication
- Graceful error handling
- Scalable design patterns
- Comprehensive security measures

The architecture supports the project's vision of a decentralized health intelligence network with multiple AI agents while maintaining code quality, security, and maintainability.

