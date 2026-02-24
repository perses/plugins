#!/bin/bash

## /!\ This file must be used at the root of the plugins repo

set -e

function fmt() {
  find . -name "*.cue" -exec cue fmt {} \;
}

function checkfmt {
  fmt
  git diff --exit-code -- .
}

if [[ "$1" == "--fmt" ]]; then
  fmt
fi

if [[ "$1" == "--checkformat" ]]; then
  checkfmt
fi
