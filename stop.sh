#!/bin/bash
# ============================================================================
# Fetcher Bot - Stop Services
# ============================================================================
# Stops hash server and Next.js
# Usage: ./stop.sh
# ============================================================================

echo ""
echo "================================================================================"
echo "                    Stopping Fetcher Bot"
echo "================================================================================"
echo ""

STOPPED_ANY=false

# Stop Next.js (both production and dev modes)
if pgrep -f "next start" > /dev/null || pgrep -f "next dev" > /dev/null; then
    echo "Stopping Next.js server..."
    pkill -f "next start" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    sleep 2

    # Force kill if still running
    if pgrep -f "next start" > /dev/null || pgrep -f "next dev" > /dev/null; then
        echo "  Force killing Next.js..."
        pkill -9 -f "next start" 2>/dev/null || true
        pkill -9 -f "next dev" 2>/dev/null || true
    fi
    echo "  ✓ Next.js stopped"
    STOPPED_ANY=true
else
    echo "Next.js is not running"
fi

# Stop any remaining node processes related to this project
if pgrep -f "node.*fetcher" > /dev/null 2>&1; then
    echo "Stopping related Node.js processes..."
    pkill -f "node.*fetcher" 2>/dev/null || true
    STOPPED_ANY=true
fi

# Stop hash server
if pgrep -f "hash-server" > /dev/null 2>&1; then
    echo "Stopping hash server..."
    pkill -f "hash-server" 2>/dev/null || true
    sleep 2

    # Force kill if still running
    if pgrep -f "hash-server" > /dev/null 2>&1; then
        echo "  Force killing hash server..."
        pkill -9 -f "hash-server" 2>/dev/null || true
    fi
    echo "  ✓ Hash server stopped"
    STOPPED_ANY=true
else
    echo "Hash server is not running"
fi

# Clean up any suspended background jobs in current shell
jobs -p 2>/dev/null | xargs kill 2>/dev/null || true

echo ""
if [ "$STOPPED_ANY" = true ]; then
    echo "✓ All services stopped successfully"
else
    echo "ℹ️  No services were running"
fi
echo ""
