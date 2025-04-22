#!/bin/bash

# Script to run tests for content filtering

echo "Running content filtering tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest tests/unit/contentFiltering.test.ts --config=jest.config.mjs

echo ""
echo "Running XML processing integration tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest tests/unit/xmlProcessing.test.ts --config=jest.config.mjs