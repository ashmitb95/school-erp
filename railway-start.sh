#!/bin/sh

# Start all services concurrently
# This script runs all microservices in the background

echo "Starting ERP microservices..."

# Start Auth Service
cd /app/services/auth && node dist/index.js &
AUTH_PID=$!
echo "Auth service started (PID: $AUTH_PID)"

# Start Student Service
cd /app/services/student && node dist/index.js &
STUDENT_PID=$!
echo "Student service started (PID: $STUDENT_PID)"

# Start Fees Service
cd /app/services/fees && node dist/index.js &
FEES_PID=$!
echo "Fees service started (PID: $FEES_PID)"

# Start Attendance Service
cd /app/services/attendance && node dist/index.js &
ATTENDANCE_PID=$!
echo "Attendance service started (PID: $ATTENDANCE_PID)"

# Start Exam Service
cd /app/services/exam && node dist/index.js &
EXAM_PID=$!
echo "Exam service started (PID: $EXAM_PID)"

# Start AI Service
cd /app/services/ai && node dist/index.js &
AI_PID=$!
echo "AI service started (PID: $AI_PID)"

# Start Management Service
cd /app/services/management && node dist/index.js &
MANAGEMENT_PID=$!
echo "Management service started (PID: $MANAGEMENT_PID)"

# Wait a bit for services to start
sleep 2

# Start API Gateway (main service on port 3000) - this is the main process
echo "Starting API Gateway..."
cd /app/services/api-gateway && node dist/index.js
GATEWAY_PID=$!

# If gateway exits, kill all services
trap "kill $AUTH_PID $STUDENT_PID $FEES_PID $ATTENDANCE_PID $EXAM_PID $AI_PID $MANAGEMENT_PID 2>/dev/null" EXIT

# Wait for API Gateway (main process)
wait $GATEWAY_PID

