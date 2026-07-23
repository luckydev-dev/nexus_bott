#!/usr/bin/env bash
FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: $0 <file>"
  exit 1
fi
RESPONSE=$(curl -s -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@$FILE" https://litterbox.catbox.moe/resources/internals/api.php)
if [[ "$RESPONSE" == http* ]]; then
  echo "$RESPONSE"
else
  TMP_RESP=$(curl -s -F "file=@$FILE" https://tmpfiles.org/api/v1/upload)
  URL=$(echo "$TMP_RESP" | jq -r '.data.url' 2>/dev/null)
  if [ -n "$URL" ] && [ "$URL" != "null" ]; then
    echo "${URL/tmpfiles.org\//tmpfiles.org\/dl\/}"
  else
    echo "$RESPONSE"
  fi
fi
