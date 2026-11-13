#!/bin/sh
set -e

# Compile C++ source code located in /tmp
if [ ! -f /tmp/code.cpp ]; then
  echo "Error: /tmp/code.cpp not found" >&2
  exit 1
fi

g++ -O2 -std=c++20 -o /tmp/a.out /tmp/code.cpp 2>&1
exec /tmp/a.out
