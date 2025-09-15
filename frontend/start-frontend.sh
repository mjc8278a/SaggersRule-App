#!/bin/sh

echo "🚀 Starting Network Checkpoint Monitor Frontend..."

# Start main React app on port 3000
PORT=3000 yarn start &

# Wait a bit for the first instance to initialize
sleep 10

# Start second instance on port 3200 for ISP access
PORT=3200 yarn start &

echo "✅ Frontend running on both ports:"
echo "   📱 Port 3000: http://localhost:3000"
echo "   🌐 Port 3200: http://localhost:3200 (ISP Access)"

# Keep the container running
wait