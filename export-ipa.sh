#!/bin/bash
ARCHIVE=$(find ~/Library/Developer/Xcode/Archives -name "*.xcarchive" | sort | tail -1)
APP=$(find "$ARCHIVE/Products/Applications" -name "*.app" | head -1)
rm -rf /tmp/ipa_build && mkdir -p /tmp/ipa_build/Payload
cp -r "$APP" /tmp/ipa_build/Payload/
cd /tmp/ipa_build && zip -r ~/Desktop/RoueDestinPokemon.ipa Payload/ -q
echo "✓ $(basename "$ARCHIVE") → ~/Desktop/RoueDestinPokemon.ipa"
