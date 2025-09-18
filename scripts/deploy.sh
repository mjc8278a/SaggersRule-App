#!/bin/bash

# SaggersRule Deployment Script
# This script automates the deployment process for SaggersRule media stack

set -e  # Exit on any error

# Configuration
PROJECT_NAME="saggersrule"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if Docker is installed and running
check_docker() {
    log "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker."
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose."
    fi
    
    log "Docker is ready ✓"
}

# Check if required files exist
check_files() {
    log "Checking required files..."
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "docker-compose.yml not found in current directory"
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        warn ".env file not found. Creating from template..."
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            log "Created .env from template. Please review and update settings."
        else
            error "No .env.example template found"
        fi
    fi
    
    log "Required files found ✓"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p media-storage/uploads
    mkdir -p processed-media
    mkdir -p "$BACKUP_DIR"
    
    # Set proper permissions
    chmod -R 755 media-storage processed-media
    
    log "Directories created ✓"
}

# Backup current deployment
backup_deployment() {
    if [[ "$1" == "--skip-backup" ]]; then
        log "Skipping backup as requested"
        return
    fi
    
    log "Creating backup of current deployment..."
    
    BACKUP_FILE="$BACKUP_DIR/${PROJECT_NAME}-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Backup configuration files
    tar -czf "$BACKUP_FILE" \
        --exclude='media-storage' \
        --exclude='processed-media' \
        --exclude='node_modules' \
        --exclude='.git' \
        . 2>/dev/null || true
    
    log "Backup created: $BACKUP_FILE ✓"
}

# Stop existing containers
stop_services() {
    log "Stopping existing services..."
    
    if docker compose ps -q | grep -q .; then
        docker compose down -v
        log "Services stopped ✓"
    else
        log "No running services found"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    docker compose pull
    log "Images updated ✓"
}

# Build and start services
start_services() {
    log "Building and starting services..."
    
    # Build and start services
    docker compose up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 10
    
    log "Services started ✓"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait a bit more for services to fully initialize
    sleep 5
    
    # Check container status
    log "Checking container status..."
    if ! docker compose ps | grep -q "Up"; then
        error "Some containers are not running properly"
    fi
    
    # Check API health
    log "Checking API health..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
        if curl -f http://localhost:3200/health &> /dev/null; then
            log "API health check passed ✓"
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log "API not ready yet, waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
        sleep 2
    done
    
    if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
        error "API health check failed after ${MAX_RETRIES} attempts"
    fi
    
    # Check Nginx health
    log "Checking Nginx health..."
    if curl -f http://localhost:3036/health &> /dev/null; then
        log "Nginx health check passed ✓"
    else
        warn "Nginx health check failed, but continuing..."
    fi
    
    log "Health checks completed ✓"
}

# Show deployment information
show_info() {
    log "Deployment completed successfully!"
    echo
    echo "=== SaggersRule Media Stack Information ==="
    echo "API URL:      http://localhost:3200"
    echo "Media Server: http://localhost:3036"
    echo "Redis:        localhost:6333 (external access)"
    echo
    echo "=== Useful Commands ==="
    echo "View logs:    docker compose logs -f"
    echo "Stop stack:   docker compose down"
    echo "Restart:      docker compose restart"
    echo "Status:       docker compose ps"
    echo
    echo "=== Test Upload ==="
    echo "curl -X POST -F \"file=@your-image.jpg\" http://localhost:3200/upload"
    echo
}

# Cleanup function
cleanup() {
    log "Cleaning up old Docker resources..."
    docker system prune -f
    log "Cleanup completed ✓"
}

# Main deployment function
deploy() {
    log "Starting SaggersRule deployment..."
    
    check_docker
    check_files
    create_directories
    backup_deployment "$@"
    stop_services
    pull_images
    start_services
    health_check
    show_info
    
    log "Deployment completed successfully! 🚀"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  deploy              Deploy the SaggersRule stack (default)"
    echo "  --skip-backup       Skip backup during deployment"
    echo "  stop                Stop all services"
    echo "  restart             Restart all services"
    echo "  status              Show service status"
    echo "  logs                Show service logs"
    echo "  cleanup             Clean up old Docker resources"
    echo "  health              Run health checks"
    echo "  -h, --help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy           # Full deployment with backup"
    echo "  $0 deploy --skip-backup  # Deploy without backup"
    echo "  $0 restart          # Restart services"
    echo "  $0 logs             # View logs"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy "$@"
        ;;
    "stop")
        log "Stopping SaggersRule services..."
        docker compose down
        log "Services stopped ✓"
        ;;
    "restart")
        log "Restarting SaggersRule services..."
        docker compose restart
        log "Services restarted ✓"
        ;;
    "status")
        log "SaggersRule service status:"
        docker compose ps
        ;;
    "logs")
        log "Showing SaggersRule logs (Ctrl+C to exit):"
        docker compose logs -f
        ;;
    "cleanup")
        cleanup
        ;;
    "health")
        health_check
        ;;
    "-h"|"--help")
        usage
        ;;
    *)
        error "Unknown command: $1. Use -h for help."
        ;;
esac