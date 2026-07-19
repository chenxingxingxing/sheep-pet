#!/bin/zsh
# 双击这个文件，小羊就会出现在桌面上
cd "$(dirname "$0")"
./node_modules/.bin/electron . > /dev/null 2>&1 &
exit 0
