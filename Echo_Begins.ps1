# Detect LAN and inject it

Write-Output "Detecting LAN IP..."

$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 `
    | Where-Object { $_.InterfaceAlias -match "Wi-Fi" -and $_.IPAddress -like "192.168.*" } `
).IPAddress

if ($wifiIp) {
    Write-Output "Detected Wi-Fi IP: $wifiIp"
    $env:HOST_IP=$wifiIp
    docker-compose up
} else {
    Write-Output "No Wi-Fi IP detected."
}

# Run Docker Compose
docker-compose up
