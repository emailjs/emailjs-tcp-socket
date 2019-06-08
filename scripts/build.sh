#!/bin/bash

npm run build
git reset
git add dist
git add res
git commit -m 'Updating dist files'
