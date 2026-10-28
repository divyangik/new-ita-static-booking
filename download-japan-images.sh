#!/usr/bin/env bash
# Run from the project root:  bash download-japan-images.sh
set -e
OUT="public/img/trips/japan"; mkdir -p "$OUT"
B="https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
get(){ curl -fL --retry 2 -o "$OUT/$1" "$B/$2" && echo "ok  $1"; }
curl -fL -o "$OUT/cover.jpg" "https://itaglobal.com/cdn/shop/files/COVERJAPANAJOURNEYTHROUGHCULTURALDEPTH_TIMELESSELEGANCE.jpg" && echo "ok  cover.jpg"
get tokyo-arrival.jpg  "New_Project_-_2026-04-27T133200.849.jpg"
get tokyo-temple.jpg   "Tokyo_Temple.jpg"
get senso-ji-gate.jpg  "Majestic_Senso-ji_Temple_Gate_in_Tokyo_1.jpg"
get tokyo-food.jpg     "pexels-ddou-dou-2163061-12150737.jpg"
get hakone-torii.jpg   "Hakone_Shrine_s_Red_Torii.jpg"
get osaka-food.jpg     "OSAKA_FOOD.jpg"
get nara-deer.jpg      "Young_Deer_in_Nara_Park_near_Stone_Lantern.jpg"
get kyoto.jpg          "kyoto.jpg"
get tea-ceremony.jpg   "Private_tea_ceremony.jpg"
get kyoto-yasaka.jpg   "Kyoto_Yasaka_Shrine_Area.jpg"
get departure.jpg      "Smooth_and_reliable_departure_flow.jpg"
get hotel-tokyo.jpg    "faci_04.jpg"
get hotel-hakone.jpg   "HAKHR-P0972-Living-Room-Fireplace-Seating.16x9.jpg"
get hotel-kyoto.jpg    "PublicSpace2.jpg"