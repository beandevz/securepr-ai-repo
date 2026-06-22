#!/bin/bash
# SecurePR AI Setup Script

set -e

echo "🚀 SecurePR Setup Starting..."

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 20+"
    exit 1
fi
echo "✅ Node.js found: $(node -v)"

# 2. Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✅ npm found: $(npm -v)"

# 3. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# 4. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# 5. Setup backend .env
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env..."
    cp backend/.env.example backend/.env
else
    echo "✅ backend/.env already exists"
fi

# 6. Setup frontend .env
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        echo "📝 Creating frontend .env..."
        cp frontend/.env.example frontend/.env
    fi
else
    echo "✅ frontend/.env already exists"
fi

# 7. Finish
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
