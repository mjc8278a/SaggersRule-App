#!/bin/bash

# Script to switch between port 3200 (ISP access)AndMessage port 3000 (preview testing)

if [ "$1" = "preview" ]; then
    echo "🌐 Configuring for PREVIEW mode (port 3000)..."
    export FRONTEND_PORT=3000
    sudo supervisorctl restart frontend
    echo "✅ Frontend restarted on port 3000"
    echo "🔗 Preview URL: https://checkpoint-tracker.preview.emergentagent.com"
elif [ "$1" = "isp" ]; then
    echo "🏠 Configuring for ISP ACCESS mode (port 3200)..."
    export FRONTEND_PORT=3200
    sudo supervisorctl restart frontend
    echo "✅ Frontend restarted on port 3200"
    echo "🔗 Local URL: http://localhost:3200"
else
    echo "Usage: $0 [preview|isp]"
    echo "  preview - Configure for Emergent preview URL (port 3000)"
    echo "  isp     - Configure for ISP access (port 3200)"
    echo ""
    echo "Current configuration:"
    echo "Frontend port: $(lsof -ti:3000 >/dev/null && echo 3000 || echo 3200)"
fi