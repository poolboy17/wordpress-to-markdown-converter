#!/bin/bash

# Script to run tests for content filtering

echo "Running content filtering tests..."
npx jest tests/unit/contentFiltering.test.ts --config=jest.config.cjs

echo ""
echo "Running XML processing integration tests..."
npx jest tests/unit/xmlProcessing.test.ts --config=jest.config.cjs