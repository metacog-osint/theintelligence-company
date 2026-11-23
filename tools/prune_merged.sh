#!/usr/bin/env bash
# Delete branches that are fully contained in origin/<default> (re-checked here), locally and on GitHub.
# Never touches the default branch, the checked-out branch, or anything unmerged.
cd "$(dirname "$0")/../.." || exit 1
for r in Vigil noise-floor PropertyCast; do
  git -C "$r" fetch -q --prune origin
  def=$(git -C "$r" symbolic-ref --short refs/remotes/origin/HEAD | sed 's|origin/||')
  cur=$(git -C "$r" rev-parse --abbrev-ref HEAD)
  wt=$(git -C "$r" worktree list --porcelain | awk '/^branch /{sub("refs/heads/","",$2); print $2}')
  nl=0; for b in $(git -C "$r" for-each-ref --format='%(refname:short)' refs/heads); do
    [ "$b" = "$def" ] || [ "$b" = "$cur" ] && continue
    echo "$wt" | grep -qx "$b" && continue
    if git -C "$r" merge-base --is-ancestor "$b" "origin/$def"; then git -C "$r" branch -q -D "$b" && nl=$((nl+1)); fi
  done
  rem=(); for b in $(git -C "$r" for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -E "^origin$|^origin/HEAD$|^origin/$def$"); do
    git -C "$r" merge-base --is-ancestor "$b" "origin/$def" && rem+=("${b#origin/}")
  done
  if [ ${#rem[@]} -gt 0 ]; then git -C "$r" push -q origin --delete "${rem[@]}" 2>&1 | grep -v '^To ' | tail -3; fi
  git -C "$r" fetch -q --prune origin
  left=$(git -C "$r" for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | grep -v -E "^origin$|origin/HEAD|^$def$|^origin/$def$" | tr '\n' ' ')
  echo "$r: deleted $nl local and ${#rem[@]} GitHub branches; still there: ${left:-none}"
done
rmdir "_worktrees" 2>/dev/null && echo "removed empty ../_worktrees"
