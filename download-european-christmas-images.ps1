# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\download-european-christmas-images.ps1
$out = "public\img\trips\european-christmas"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$b = "https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
$files = [ordered]@{
  "budapest-night"     = "$b/leonhard-niederwimmer-pv-gC9-Ki7E-unsplash_1.jpg"
  "danube-cruise"      = "$b/pexels-nicole-michalou-5768972.jpg"
  "budapest-baths"     = "$b/The_Common_Wanderer-185-3.jpg"
  "szentendre"         = "$b/192920.jpg"
  "christmas-market"   = "$b/naira-babayan-wz8TdZkp-5o-unsplash.jpg"
  "nutcracker"         = "$b/5-nutcracker-doll-leaping.original_9c763bc877987c02f78ae64259e693d3.jpg"
  "road-to-vienna"     = "$b/anton-F_WBo7keVqY-unsplash.jpg"
  "vienna-imperial"    = "$b/sandra-bittmann-WYMg2wNOVlI-unsplash.jpg"
  "schonbrunn"         = "$b/luca-n-GNX6twUsncU-unsplash.jpg"
  "schonbrunn-gallery" = "$b/csm_7_Grosse_Galerie__c__SKB__Foto_Agentur_Zolles_574291c4a3.jpg"
  "vienna-market"      = "$b/image.jpg"
  "vienna-opera"       = "$b/alexander-8j1ABxCEFNI-unsplash.jpg"
  "prague-arrival"     = "$b/methode_times_prod_web_bin_0f9568b0-6cbe-4f61-b8aa-c9c7709b8819.jpg"
  "prague-market"      = "$b/4d0bFZOE0Mq6swAs0SKku4C.jpg"
  "beer-spa"           = "$b/Czech-Republic-beer-spa-room.jpg"
  "christmas-dinner"   = "$b/PRGAZ-P0444-Christmas-Dinner.16x.jpg"
  "prague-clock"       = "$b/prague-orloj-01.jpg"
  "departure"          = "$b/1671462c4ab8ef00a9d1db2850703a53.jpg"
}
function Get-Image($name, $url) {
  try { Invoke-WebRequest -Uri $url -OutFile "$out\$name" -UseBasicParsing; Write-Host "ok  $name" }
  catch { Write-Host "FAIL $name  $($_.Exception.Message)" -ForegroundColor Red }
}
Get-Image "cover.jpg" "https://itaglobal.com/cdn/shop/files/COVEREXPERIENCETHEMAGICOFAEUROPEANCHRISTMASAF.jpg"
foreach ($name in $files.Keys) {
  $url = $files[$name]
  Get-Image "$name.jpg" $url
  Get-Image "$name-800.jpg" "$($url)?width=800"
  Get-Image "$name-1600.jpg" "$($url)?width=1600"
}
Get-Image "budapest-night-2400.jpg" "$($files['budapest-night'])?width=2400"