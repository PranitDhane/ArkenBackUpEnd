# Frontend - Installation Guide

Quick setup guide for the ARKEN AI Frontend application.

---

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 10.x or higher
- **Backend API**: Running on `http://localhost:8001`

---

## Installation Steps

### 1. Navigate to Directory

```bash
cd /Users/akashnikam/workspace/frontend
```

### 2. Create Environment File

```bash
cp .env.example .env
```

The `.env` file contains:
```
VITE_API_URL=http://localhost:8001/api
```

**Note**: Update `VITE_API_URL` if your backend API runs on a different port.

---

### 3. Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 280 packages, and audited 281 packages in 3s

129 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

This installs:
- **React 19.2.0** - UI library
- **Vite 7.2.4** - Build tool and dev server
- **Tailwind CSS 4.1.18** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering with syntax highlighting

---

### 4. Run Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v7.3.1  ready in 548 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

The application will be available at `http://localhost:5173/`

---

## Verify Installation

Open your browser and navigate to:
```
http://localhost:5173/
```

You should see the ARKEN AI frontend interface.

---

## Available Scripts

### Development Mode

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement (HMR).

### Production Build

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally.

### Lint Code

```bash
npm run lint
```

Run ESLint to check code quality.

---

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Restart dev server
npm run dev
```

Or specify a different port:

```bash
npm run dev -- --port 3000
```

### Module Not Found

Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Backend Connection Issues

Ensure the backend API is running and the `VITE_API_URL` in `.env` is correct:

```bash
# Check backend is running
curl http://localhost:8001/health

# Verify .env configuration
cat .env
```

### Build Errors

Clear the Vite cache and rebuild:

```bash
rm -rf node_modules/.vite
npm run build
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8001/api` | Backend API base URL |

**Development:**
```bash
VITE_API_URL=http://localhost:8001/api
```

**Production:**
```bash
VITE_API_URL=https://api.arken.ai/api
```

**Note**: All environment variables must be prefixed with `VITE_` to be exposed to the application.

---

## Quick Reference

```bash
# Navigate to frontend directory
cd /Users/akashnikam/workspace/frontend

# Create .env file
cp .env.example .env

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| Vite | 7.2.4 | Build tool & dev server |
| Tailwind CSS | 4.1.18 | CSS framework |
| Lucide React | 0.562.0 | Icons |
| React Markdown | 10.1.0 | Markdown rendering |
| date-fns | 4.1.0 | Date utilities |

---

## Development Workflow

1. **Start Backend Services** (in separate terminals):
   ```bash
   # Terminal 1: Calculation Engine
   cd /Users/akashnikam/workspace/calculation_engine
   python3 main.py
   
   # Terminal 2: Backend API (if separate)
   cd /Users/akashnikam/workspace/backend
   # Run backend server
   ```

2. **Start Frontend**:
   ```bash
   cd /Users/akashnikam/workspace/frontend
   npm run dev
   ```

3. **Access Application**:
   - Frontend: `http://localhost:5173/`
   - Backend API: `http://localhost:8001/`
   - Calculation Engine: `http://localhost:8000/`

---

## Production Deployment

### Build the Application

```bash
npm run build
```

The optimized production build will be in the `dist/` folder.

### Serve Production Build

```bash
# Option 1: Using Vite preview
npm run preview

# Option 2: Using a static file server
npx serve -s dist -p 3000

# Option 3: Using nginx, Apache, or other web servers
# Copy dist/ contents to web server root
```

---

## Browser Support

- **Chrome/Edge**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions

---

## Next Steps

After installation:

1. **Configure API endpoint**: Update `VITE_API_URL` in `.env` if needed
2. **Customize theme**: Modify Tailwind configuration in `tailwind.config.js`
3. **Add features**: Explore `src/` directory for components and pages
4. **Run tests**: Set up testing framework (if required)

For more details, see the [README.md](README.md).
