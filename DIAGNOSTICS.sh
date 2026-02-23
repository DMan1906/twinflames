#!/bin/bash
# Quick diagnostics for Twinflames deployment issues

echo "=== Twinflames Deployment Diagnostics ==="
echo ""

echo "1. Container Status:"
docker ps | grep twinflame || echo "❌ Container not found"
echo ""

echo "2. Last 50 logs:"
docker logs twinflame-twinflames-iipn7d 2>&1 | tail -50
echo ""

echo "3. Checking if port 3000 is responding:"
curl -I http://localhost:3000 2>/dev/null | head -5 || echo "❌ Port 3000 not responding"
echo ""

echo "4. Checking app process:"
docker exec twinflame-twinflames-iipn7d ps aux | grep -i node || echo "❌ Node process not found"
echo ""

echo "5. Environment variables check:"
docker exec twinflame-twinflames-iipn7d env | grep -i "NEXT_PUBLIC_APPWRITE\|GEMINI" | head -10
echo ""

echo "6. Checking .next folder:"
docker exec twinflame-twinflames-iipn7d ls -lh .next/standalone/ 2>/dev/null || echo "❌ Standalone folder missing"
echo ""

echo "=== End Diagnostics ==="
