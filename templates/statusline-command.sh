#!/usr/bin/env bash

input=$(cat)

cyan='\033[0;36m'
yellow='\033[0;33m'
reset='\033[0m'
red='\033[0;31m'
gray='\033[1;30m'

bar_length=10

print_colored() {
  local color="$1"; local text="$2"; printf "${color}%s${reset}" "$text"
}

get_value() {
  # arg: jq filter
  echo "$input" | jq -r "$1"
}

clamp() {
  local val="$1"
  local min="$2"
  local max="$3"
  if [ "$val" -lt "$min" ] 2>/dev/null; then
    echo "$min"
  elif [ "$val" -gt "$max" ] 2>/dev/null; then
    echo "$max"
  else
    echo "$val"
  fi
}

make_bar() {
  local percent="$1"
  local fill_len=$(( (percent * bar_length + 50) / 100 )) # Round to nearest integer
  (( fill_len > bar_length )) && fill_len=$bar_length
  (( fill_len < 0 )) && fill_len=0
  local empty_len=$(( bar_length - fill_len ))

  for ((i=0; i<fill_len; i++)); do
    printf "█"
  done
  for ((i=0; i<empty_len; i++)); do
    printf "▒"
  done
}

ctx_bar_section() {
  local ctx="$1"
  [ -z "$ctx" ] && return

  local ctx_int=$(clamp "${ctx%.*}" 0 100)
  local bar_color suffix

  if [ "$ctx_int" -ge 80 ] 2>/dev/null; then
    bar_color=$red
    suffix=" ctx — /session-export"
  elif [ "$ctx_int" -ge 60 ] 2>/dev/null; then
    bar_color=$yellow
    suffix=" ctx"
  else
    bar_color=$gray
    suffix=" ctx"
  fi

  local bar
  bar="$(make_bar "$ctx_int")"

  printf " | "
  print_colored "$bar_color" "[$bar]"
  printf " %s%%%s" "$ctx" "$suffix"
}

cwd=$(get_value '.workspace.current_dir // .cwd // ""')
dir=$(basename "$cwd")
model=$(get_value '.model.display_name // ""')
ctx=$(get_value '.context_window.used_percentage // empty')
branch=$(git --no-optional-locks -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)

print_colored "$cyan" "$dir"

[ -n "$branch" ] && { printf " "; print_colored "$yellow" "[$branch]"; }
[ -n "$model" ] && printf " | %s" "$model"

ctx_bar_section "$ctx"

printf '\n'
