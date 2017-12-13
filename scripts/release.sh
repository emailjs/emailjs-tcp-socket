#!/bin/bash

json_value() {
  KEY=$1
  num=$2
  awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'$KEY'\042/){print $(i+1)}}}' | tr -d '"' | sed -n ${num}p
}

# read version from package.json and trim leading/trailing whitespace
VERSION=`less package.json | json_value version 1 | sed -e 's/^ *//' -e 's/ *$//'`
PREFIX="v"

npm run build
git reset
git add dist
git add res
git commit -m 'Updating dist files'
# tag, push, publish
echo -e "\n> tagging $PREFIX$VERSION"
git tag "$PREFIX$VERSION"
echo -e "\n> pushing commits to origin"
git push
echo -e "\n> pushing tags to origin"
git push --tags
echo -e "\n> publishing on npm"
npm publish
