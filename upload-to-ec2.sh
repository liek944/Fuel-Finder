#!/bin/bash
# Upload modified backend file to EC2
# Edit the variables below with your EC2 details

# ⚠️ EDIT THESE VARIABLES
EC2_KEY="~/path/to/your-key.pem"  # Path to your EC2 SSH key
EC2_USER="ubuntu"                  # EC2 username (usually ubuntu or ec2-user)
EC2_HOST="your-ec2-ip-or-domain"   # EC2 IP address or domain
EC2_BACKEND_PATH="/home/ubuntu/fuel_finder/backend"  # Path to backend on EC2

echo "🚀 Uploading Backend Changes to EC2"
echo "===================================="
echo ""

# Check if variables are set
if [ "$EC2_HOST" = "your-ec2-ip-or-domain" ]; then
  echo "❌ ERROR: Please edit this script and set your EC2 details:"
  echo "   - EC2_KEY"
  echo "   - EC2_USER"
  echo "   - EC2_HOST"
  echo "   - EC2_BACKEND_PATH"
  exit 1
fi

# Upload modified file
echo "📤 Uploading ownerDetection.js..."
scp -i "$EC2_KEY" \
  backend/middleware/ownerDetection.js \
  "$EC2_USER@$EC2_HOST:$EC2_BACKEND_PATH/middleware/"

if [ $? -eq 0 ]; then
  echo "✅ File uploaded successfully!"
  echo ""
  echo "🔄 Now restart PM2 on EC2:"
  echo ""
  echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
  echo "  cd $EC2_BACKEND_PATH"
  echo "  pm2 restart fuel-finder-api"
  echo "  pm2 logs fuel-finder-api --lines 50"
  echo ""
else
  echo "❌ Upload failed. Check your EC2 credentials."
  exit 1
fi
