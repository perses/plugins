#!/bin/bash
set -eu

workspaces=$(jq -r '.workspaces[]' < package.json)

function bumpVersion() {
  version="${1}"
  if [[ "${version}" == v* ]]; then
    version="${version:1}"
  fi
  # upgrade the @perses-dev/* dependencies on all packages
  for workspace in ${workspaces}; do
    # sed -i syntax is different on mac and linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -E -i "" "s|(\"@perses-dev/.+\": )\".+\"|\1\"^${version}\"|" "${workspace}/package.json"
    else
      sed -E -i "s|(\"@perses-dev/.+\": )\".+\"|\1\"^${version}\"|" "${workspace}/package.json"
    fi
  done
}

bumpVersion "$@"
