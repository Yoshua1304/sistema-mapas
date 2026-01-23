# Configuración Geodata App
$IMAGE_NAME = "fabrizioromano22/geodata-app:latest"
$CONTAINER_NAME = "geodata-app-container"
$PORT_MAP = "5001:5001"
$ENV_FILE = ".env"
$CHECK_INTERVAL = 60 # Bajamos a 1 minuto para que lo veas rápido

Write-Host "MONITOR INTELIGENTE ACTIVADO" -ForegroundColor Green

while($true) {
    # 1. Obtener el ID de la imagen que el contenedor está usando actualmente
    $currentId = (docker inspect --format='{{.Image}}' $CONTAINER_NAME 2>$null)
    
    # 2. Intentar bajar la imagen (por si hubo cambios en la nube)
    docker pull $IMAGE_NAME | Out-Null
    
    # 3. Obtener el ID de la imagen 'latest' que hay en el sistema ahora
    $latestId = (docker inspect --format='{{.Id}}' $IMAGE_NAME 2>$null)

    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Comparando IDs..." -ForegroundColor Cyan

    # 4. LA MAGIA: Si el ID del contenedor es distinto al ID de la imagen 'latest'
    if ($currentId -ne $latestId) {
        Write-Host "¡CAMBIO DETECTADO! Actualizando de $currentId a $latestId" -ForegroundColor Yellow
        docker rm -f $CONTAINER_NAME
        docker run -d --name $CONTAINER_NAME -p $PORT_MAP --env-file $ENV_FILE --restart always $IMAGE_NAME
        Write-Host "Actualización completada con éxito." -ForegroundColor Green
    } else {
        # Si por alguna razón el contenedor se detuvo o no existe, lo levanta
        $status = (docker inspect --format='{{.State.Status}}' $CONTAINER_NAME 2>$null)
        if ($status -ne "running") {
            Write-Host "El contenedor no estaba corriendo. Iniciando..." -ForegroundColor Yellow
            docker rm -f $CONTAINER_NAME 2>$null
            docker run -d --name $CONTAINER_NAME -p $PORT_MAP --env-file $ENV_FILE --restart always $IMAGE_NAME
        } else {
            Write-Host "El contenedor ya usa la última versión." -ForegroundColor Gray
        }
    }
    Start-Sleep -Seconds $CHECK_INTERVAL
}