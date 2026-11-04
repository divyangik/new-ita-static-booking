# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\download-cartagena-images.ps1
$out = "public\img\trips\cartagena"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$b = "https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
$files = [ordered]@{
  "old-town-banner.png"    = "$b/day1-banner.png"
  "cartagena-overview.png" = "$b/banner-1_533bed5c-433a-46c1-9685-95c54710da23.png"
  "walled-city.png"        = "$b/day2-img1.png"
  "old-town-street.png"    = "$b/day2-img2.png"
  "plaza-music.png"        = "$b/day2-img3.png"
  "island-boat.png"        = "$b/day3-img1.png"
  "caribbean-coast.png"    = "$b/day3-img2.png"
  "island-life.png"        = "$b/day3-img3.png"
  "rooftop-pool.png"       = "$b/day4-img1.png"
  "departure.png"          = "$b/day5-img1.png"
  "food.png"               = "$b/food-img1.png"
  "movich.png"             = "$b/include-img1.png"
  "movich-1.png"           = "$b/movich-img1.png"
  "movich-2.png"           = "$b/movich-img2.png"
}
function Get-Image($name, $url) {
  try { Invoke-WebRequest -Uri $url -OutFile "$out\$name" -UseBasicParsing; Write-Host "ok  $name" }
  catch { Write-Host "FAIL $name  $($_.Exception.Message)" -ForegroundColor Red }
}
Get-Image "cover.jpg" "https://itaglobal.com/cdn/shop/files/The-Best-of-Cartagena_6405a1bb-abd0-45c8-b806-dfad1dedf564.jpg"
foreach ($file in $files.Keys) {
  $url = $files[$file]
  $base = [IO.Path]::GetFileNameWithoutExtension($file)
  $ext = [IO.Path]::GetExtension($file)
  Get-Image $file $url
  Get-Image "$base-800$ext" "$($url)?width=800"
  Get-Image "$base-1600$ext" "$($url)?width=1600"
}
Get-Image "old-town-banner-2400.png" "$($files['old-town-banner.png'])?width=2400"