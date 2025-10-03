# Detect LAN and inject it

Write-Output "Detecting LAN IP..."
$env:HOST_IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' }).IPAddress
Write-Output "Detected HOST_IP: $env:HOST_IP"

# Run Docker Compose
docker-compose up
