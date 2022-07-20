#!/usr/bin/env sh

set -e

npm run build

cd dist

git init
git checkout -b main
git add -A
git commit -m 'Deploy'
git push -f git@github.com:digikid/ms-cleaner.git main:gh-pages

cd -
